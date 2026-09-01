pub mod buffer;
pub mod crdt;
pub mod diff;

use buffer::{Point, TextBuffer};
use crdt::CrdtJournal;
use diff::{compute_fnv1a_hash, compute_text_edit};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct InknestEngine {
    buffer: TextBuffer,
    journal: CrdtJournal,
}

#[wasm_bindgen]
impl InknestEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(initial_text: &str, client_id: Option<String>) -> Self {
        let cid = client_id.unwrap_or_else(|| "local-client".to_string());
        Self {
            buffer: TextBuffer::new(initial_text),
            journal: CrdtJournal::new(&cid),
        }
    }

    pub fn get_text(&self) -> String {
        self.buffer.text()
    }

    pub fn len_chars(&self) -> usize {
        self.buffer.len_chars()
    }

    pub fn len_lines(&self) -> usize {
        self.buffer.len_lines()
    }

    pub fn insert(&mut self, offset: usize, text: &str) -> Result<JsValue, JsValue> {
        self.buffer.insert(offset, text);
        let op = self.journal.record_local_insert(offset, text);
        serde_wasm_bindgen::to_value(&op)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    pub fn delete(&mut self, from: usize, to: usize) -> Result<JsValue, JsValue> {
        self.buffer.delete(from, to);
        let op = self.journal.record_local_delete(from, to);
        serde_wasm_bindgen::to_value(&op)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    pub fn point_to_offset(&self, line: usize, column: usize) -> usize {
        self.buffer.point_to_offset(Point { line, column })
    }

    pub fn offset_to_point(&self, offset: usize) -> Result<JsValue, JsValue> {
        let pt = self.buffer.offset_to_point(offset);
        serde_wasm_bindgen::to_value(&pt)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    pub fn compute_patch(&self, target_text: &str) -> Result<JsValue, JsValue> {
        let current = self.buffer.text();
        let edit = compute_text_edit(&current, target_text);
        serde_wasm_bindgen::to_value(&edit)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    pub fn compute_hash(&self) -> String {
        compute_fnv1a_hash(&self.buffer.text())
    }

    pub fn compact_snapshot(&mut self) -> String {
        self.journal.compact();
        self.buffer.text()
    }
}
