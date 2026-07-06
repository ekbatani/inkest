import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const markSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fafafa">' +
  '<path d="M12 2.1c1.9 2.9 3.6 4.6 3.6 6.7a3.6 3.6 0 1 1-7.2 0c0-2.1 1.7-3.8 3.6-6.7Z"/>' +
  '<path d="M9 14.35c0-1.02 1.29-1.75 3-1.75s3 .73 3 1.75L12.86 21c-.16.62-1.06.66-1.28.06l-.02-.06L9 14.35Z"/>' +
  "</svg>";
const markDataUri = `data:image/svg+xml;base64,${Buffer.from(markSvg).toString("base64")}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#141414",
        }}
      >
        <img width={104} height={104} src={markDataUri} alt="" />
      </div>
    ),
    { ...size },
  );
}
