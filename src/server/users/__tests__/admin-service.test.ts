import assert from "node:assert/strict";
import { describe, test, beforeEach, afterEach } from "node:test";
import {
  getDeploymentMode,
  isCloudDeployment,
  getAdminEmails,
} from "../../config/deployment";
import { requireAdminUser, isAdmin, AdminAccessError } from "../../auth/admin";
import { db, schema } from "../../db/client";
import { eq } from "drizzle-orm";
import { verifyCredentials, createUserWithWorkspace } from "../../auth/users";

describe("Deployment configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.INKEST_DEPLOYMENT_ENV;
    delete process.env.DEPLOYMENT_ENV;
    delete process.env.INKEST_CLOUD;
    delete process.env.ADMIN_EMAILS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("defaults to self-hosted environment", () => {
    assert.equal(getDeploymentMode(), "self-hosted");
    assert.equal(isCloudDeployment(), false);
  });

  test("identifies cloud deployment when INKEST_DEPLOYMENT_ENV is cloud", () => {
    process.env.INKEST_DEPLOYMENT_ENV = "cloud";
    assert.equal(getDeploymentMode(), "cloud");
    assert.equal(isCloudDeployment(), true);
  });

  test("identifies cloud deployment when INKEST_CLOUD is true", () => {
    process.env.INKEST_CLOUD = "true";
    assert.equal(getDeploymentMode(), "cloud");
    assert.equal(isCloudDeployment(), true);
  });

  test("parses ADMIN_EMAILS into normalized lowercase list", () => {
    process.env.ADMIN_EMAILS = " Admin@Inkest.COM , amir@inkest.com , ";
    const emails = getAdminEmails();
    assert.deepEqual(emails, ["admin@inkest.com", "amir@inkest.com"]);
  });
});

describe("Admin Access & Authorization", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.INKEST_DEPLOYMENT_ENV;
    delete process.env.DEPLOYMENT_ENV;
    delete process.env.INKEST_CLOUD;
    delete process.env.ADMIN_EMAILS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("blocks admin access in self-hosted mode with NOT_CLOUD error", async () => {
    process.env.INKEST_DEPLOYMENT_ENV = "self-hosted";
    await assert.rejects(
      async () => {
        await requireAdminUser();
      },
      (err: unknown) => {
        assert.ok(err instanceof AdminAccessError);
        assert.equal((err as AdminAccessError).code, "NOT_CLOUD");
        return true;
      },
    );
    assert.equal(await isAdmin(), false);
  });
});

describe("Admin User Management Service", () => {
  const originalEnv = { ...process.env };
  const testRunId = Date.now().toString();
  const adminEmail = `admin-${testRunId}@example.com`;
  const userEmail = `user-${testRunId}@example.com`;
  let adminUserId: string;
  let regularUserId: string;

  beforeEach(async () => {
    process.env.INKEST_DEPLOYMENT_ENV = "cloud";
    process.env.ADMIN_EMAILS = adminEmail;

    // Create test admin
    const adminRes = await createUserWithWorkspace(
      adminEmail,
      "Password123!",
      "Admin User",
      "admin",
    );
    if ("userId" in adminRes && adminRes.userId) {
      adminUserId = adminRes.userId;
    }

    // Create test regular user
    const userRes = await createUserWithWorkspace(
      userEmail,
      "Password123!",
      "Regular User",
      "user",
    );
    if ("userId" in userRes && userRes.userId) {
      regularUserId = userRes.userId;
    }
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    // Clean up created users
    if (adminUserId) {
      await db.delete(schema.users).where(eq(schema.users.id, adminUserId));
    }
    if (regularUserId) {
      await db.delete(schema.users).where(eq(schema.users.id, regularUserId));
    }
  });

  test("suspension blocks user credentials verification", async () => {
    // Before suspension: valid
    const userBefore = await verifyCredentials(userEmail, "Password123!");
    assert.ok(userBefore !== null);

    // Update status to suspended
    await db
      .update(schema.users)
      .set({ status: "suspended" })
      .where(eq(schema.users.id, regularUserId));

    // After suspension: blocked
    const userAfter = await verifyCredentials(userEmail, "Password123!");
    assert.equal(userAfter, null);
  });

  test("prevents suspended users from logging in even with correct password", async () => {
    await db
      .update(schema.users)
      .set({ status: "suspended" })
      .where(eq(schema.users.id, regularUserId));

    const verified = await verifyCredentials(userEmail, "Password123!");
    assert.equal(verified, null);
  });

  test("can update user status and role via admin functions in database", async () => {
    // Role update
    await db
      .update(schema.users)
      .set({ role: "admin" })
      .where(eq(schema.users.id, regularUserId));

    const updatedUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, regularUserId))
      .limit(1);

    assert.equal(updatedUser[0]?.role, "admin");

    // Status update
    await db
      .update(schema.users)
      .set({ status: "suspended" })
      .where(eq(schema.users.id, regularUserId));

    const suspendedUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, regularUserId))
      .limit(1);

    assert.equal(suspendedUser[0]?.status, "suspended");
  });
});
