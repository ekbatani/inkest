use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OpId {
    pub client_id: String,
    pub seq: u64,
    pub lamport: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Operation {
    #[serde(rename = "insert")]
    Insert {
        id: OpId,
        pos: usize,
        text: String,
    },
    #[serde(rename = "delete")]
    Delete {
        id: OpId,
        from: usize,
        to: usize,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrdtJournal {
    pub client_id: String,
    pub local_seq: u64,
    pub lamport_clock: u64,
    pub vector_clock: HashMap<String, u64>,
    pub operations: Vec<Operation>,
}

impl CrdtJournal {
    pub fn new(client_id: &str) -> Self {
        let mut vector_clock = HashMap::new();
        vector_clock.insert(client_id.to_string(), 0);
        Self {
            client_id: client_id.to_string(),
            local_seq: 0,
            lamport_clock: 0,
            vector_clock,
            operations: Vec::new(),
        }
    }

    pub fn next_op_id(&mut self) -> OpId {
        self.local_seq += 1;
        self.lamport_clock += 1;
        self.vector_clock.insert(self.client_id.clone(), self.local_seq);

        OpId {
            client_id: self.client_id.clone(),
            seq: self.local_seq,
            lamport: self.lamport_clock,
        }
    }

    pub fn record_local_insert(&mut self, pos: usize, text: &str) -> Operation {
        let id = self.next_op_id();
        let op = Operation::Insert {
            id,
            pos,
            text: text.to_string(),
        };
        self.operations.push(op.clone());
        op
    }

    pub fn record_local_delete(&mut self, from: usize, to: usize) -> Operation {
        let id = self.next_op_id();
        let op = Operation::Delete { id, from, to };
        self.operations.push(op.clone());
        op
    }

    pub fn apply_remote_operation(&mut self, op: Operation) {
        let (client_id, seq, lamport) = match &op {
            Operation::Insert { id, .. } | Operation::Delete { id, .. } => {
                (&id.client_id, id.seq, id.lamport)
            }
        };

        self.lamport_clock = self.lamport_clock.max(lamport) + 1;
        let entry = self.vector_clock.entry(client_id.clone()).or_insert(0);
        *entry = (*entry).max(seq);

        self.operations.push(op);
    }

    pub fn compact(&mut self) {
        self.operations.clear();
    }
}
