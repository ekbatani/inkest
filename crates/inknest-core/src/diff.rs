use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TextEdit {
    pub from: usize,
    pub to: usize,
    pub text: String,
}

pub fn compute_text_edit(old_str: &str, new_str: &str) -> Option<TextEdit> {
    if old_str == new_str {
        return None;
    }

    let old_chars: Vec<char> = old_str.chars().collect();
    let new_chars: Vec<char> = new_str.chars().collect();

    let old_len = old_chars.len();
    let new_len = new_chars.len();

    let mut prefix = 0;
    while prefix < old_len && prefix < new_len && old_chars[prefix] == new_chars[prefix] {
        prefix += 1;
    }

    let mut suffix = 0;
    while suffix < (old_len - prefix)
        && suffix < (new_len - prefix)
        && old_chars[old_len - 1 - suffix] == new_chars[new_len - 1 - suffix]
    {
        suffix += 1;
    }

    let from = prefix;
    let to = old_len - suffix;
    let text: String = new_chars[prefix..(new_len - suffix)].iter().collect();

    Some(TextEdit { from, to, text })
}

pub fn compute_fnv1a_hash(content: &str) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    const PRIME: u64 = 0x100000001b3;

    for byte in content.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(PRIME);
    }

    format!("{:016x}", hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_diff() {
        let edit = compute_text_edit("Hello World", "Hello Beautiful World").unwrap();
        assert_eq!(edit.from, 5);
        assert_eq!(edit.to, 5);
        assert_eq!(edit.text, " Beautiful");
    }

    #[test]
    fn test_fnv1a_hash() {
        let h1 = compute_fnv1a_hash("test string");
        let h2 = compute_fnv1a_hash("test string");
        let h3 = compute_fnv1a_hash("different string");

        assert_eq!(h1, h2);
        assert_ne!(h1, h3);
    }
}
