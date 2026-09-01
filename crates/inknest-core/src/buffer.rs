use ropey::Rope;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Point {
    pub line: usize,
    pub column: usize,
}

#[derive(Debug, Clone)]
pub struct TextBuffer {
    rope: Rope,
}

impl TextBuffer {
    pub fn new(initial_text: &str) -> Self {
        Self {
            rope: Rope::from_str(initial_text),
        }
    }

    pub fn text(&self) -> String {
        self.rope.to_string()
    }

    pub fn slice_text(&self, from: usize, to: usize) -> Option<String> {
        let char_len = self.rope.len_chars();
        let from_clamped = from.min(char_len);
        let to_clamped = to.min(char_len);
        if from_clamped > to_clamped {
            return None;
        }
        Some(self.rope.slice(from_clamped..to_clamped).to_string())
    }

    pub fn len_chars(&self) -> usize {
        self.rope.len_chars()
    }

    pub fn len_bytes(&self) -> usize {
        self.rope.len_bytes()
    }

    pub fn len_lines(&self) -> usize {
        self.rope.len_lines()
    }

    pub fn insert(&mut self, char_idx: usize, text: &str) {
        let char_idx = char_idx.min(self.rope.len_chars());
        self.rope.insert(char_idx, text);
    }

    pub fn delete(&mut self, from_char_idx: usize, to_char_idx: usize) {
        let max_len = self.rope.len_chars();
        let from = from_char_idx.min(max_len);
        let to = to_char_idx.min(max_len);
        if from < to {
            self.rope.remove(from..to);
        }
    }

    pub fn point_to_offset(&self, point: Point) -> usize {
        let total_lines = self.rope.len_lines();
        if point.line >= total_lines {
            return self.rope.len_chars();
        }
        let line_start_char = self.rope.line_to_char(point.line);
        let line_len = self.rope.line(point.line).len_chars();
        let col = point.column.min(line_len);
        line_start_char + col
    }

    pub fn offset_to_point(&self, char_offset: usize) -> Point {
        let clamped = char_offset.min(self.rope.len_chars());
        let line = self.rope.char_to_line(clamped);
        let line_start = self.rope.line_to_char(line);
        let column = clamped.saturating_sub(line_start);
        Point { line, column }
    }

    pub fn line_text(&self, line_idx: usize) -> Option<String> {
        if line_idx < self.rope.len_lines() {
            Some(self.rope.line(line_idx).to_string())
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_buffer_operations() {
        let mut buffer = TextBuffer::new("Hello world");
        assert_eq!(buffer.len_chars(), 11);

        buffer.insert(5, ", beautiful");
        assert_eq!(buffer.text(), "Hello, beautiful world");

        buffer.delete(5, 16);
        assert_eq!(buffer.text(), "Hello world");
    }

    #[test]
    fn test_point_offset_conversions() {
        let buffer = TextBuffer::new("Line 1\nLine 2\nLine 3");
        let p = buffer.offset_to_point(7);
        assert_eq!(p.line, 1);
        assert_eq!(p.column, 0);

        let offset = buffer.point_to_offset(Point { line: 1, column: 4 });
        assert_eq!(offset, 11);
    }
}
