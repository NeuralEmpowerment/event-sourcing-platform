//! Configuration parsing and validation

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::error::{Result, VsaError};

/// VSA configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VsaConfig {
    /// Configuration version
    pub version: u32,

    /// Root directory for contexts (relative to config file)
    pub root: PathBuf,

    /// Primary language
    pub language: String,

    /// Optional framework integration
    #[serde(default)]
    pub framework: Option<FrameworkConfig>,

    /// Context-specific configuration
    #[serde(default)]
    pub contexts: HashMap<String, ContextConfig>,

    /// Validation rules
    #[serde(default)]
    pub validation: ValidationConfig,

    /// Pattern definitions
    #[serde(default)]
    pub patterns: PatternsConfig,
}

/// Framework integration configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrameworkConfig {
    /// Framework name
    pub name: String,

    /// Base types configuration
    #[serde(default)]
    pub base_types: HashMap<String, BaseTypeConfig>,
}

/// Base type configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaseTypeConfig {
    /// Import path
    pub import: String,

    /// Class/type name
    pub class: String,
}

/// Context-specific configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ContextConfig {
    /// Context description
    pub description: Option<String>,

    /// Optional features to disable validation for
    #[serde(default)]
    pub optional_features: Vec<String>,

    /// Custom patterns for this context
    #[serde(default)]
    pub patterns: Option<PatternsConfig>,
}

/// Validation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationConfig {
    /// Require tests for all operations
    #[serde(default = "default_true")]
    pub require_tests: bool,

    /// Require integration events in _shared
    #[serde(default = "default_true")]
    pub require_integration_events_in_shared: bool,

    /// Maximum nesting depth for features
    #[serde(default = "default_max_depth")]
    pub max_nesting_depth: usize,

    /// Allow nested features
    #[serde(default = "default_true")]
    pub allow_nested_features: bool,
}

impl Default for ValidationConfig {
    fn default() -> Self {
        Self {
            require_tests: true,
            require_integration_events_in_shared: true,
            max_nesting_depth: 3,
            allow_nested_features: true,
        }
    }
}

/// Pattern configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternsConfig {
    /// Command pattern (e.g., "*Command.ts")
    #[serde(default = "default_command_pattern")]
    pub command: String,

    /// Event pattern (e.g., "*Event.ts")
    #[serde(default = "default_event_pattern")]
    pub event: String,

    /// Handler pattern (e.g., "*Handler.ts")
    #[serde(default = "default_handler_pattern")]
    pub handler: String,

    /// Query pattern (e.g., "*Query.ts")
    #[serde(default = "default_query_pattern")]
    pub query: String,

    /// Integration event pattern (e.g., "*IntegrationEvent.ts")
    #[serde(default = "default_integration_event_pattern")]
    pub integration_event: String,

    /// Test pattern (e.g., "*.test.ts")
    #[serde(default = "default_test_pattern")]
    pub test: String,
}

impl Default for PatternsConfig {
    fn default() -> Self {
        Self {
            command: default_command_pattern(),
            event: default_event_pattern(),
            handler: default_handler_pattern(),
            query: default_query_pattern(),
            integration_event: default_integration_event_pattern(),
            test: default_test_pattern(),
        }
    }
}

/// Language-specific configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageConfig {
    /// File extension
    pub extension: String,

    /// Pattern overrides
    #[serde(default)]
    pub patterns: Option<PatternsConfig>,
}

// Default values
fn default_true() -> bool {
    true
}

fn default_max_depth() -> usize {
    3
}

fn default_command_pattern() -> String {
    "*Command".to_string()
}

fn default_event_pattern() -> String {
    "*Event".to_string()
}

fn default_handler_pattern() -> String {
    "*Handler".to_string()
}

fn default_query_pattern() -> String {
    "*Query".to_string()
}

fn default_integration_event_pattern() -> String {
    "*IntegrationEvent".to_string()
}

fn default_test_pattern() -> String {
    "*.test".to_string()
}

impl VsaConfig {
    /// Load configuration from a YAML file
    pub fn from_file(path: &Path) -> Result<Self> {
        if !path.exists() {
            return Err(VsaError::ConfigNotFound(path.to_path_buf()));
        }

        let content = std::fs::read_to_string(path)?;
        let config: VsaConfig = serde_yaml::from_str(&content)?;

        config.validate()?;

        Ok(config)
    }

    /// Validate configuration
    pub fn validate(&self) -> Result<()> {
        if self.version != 1 {
            return Err(VsaError::InvalidConfig(format!(
                "Unsupported version: {}. Expected: 1",
                self.version
            )));
        }

        if !["typescript", "python", "rust"].contains(&self.language.as_str()) {
            return Err(VsaError::UnsupportedLanguage(self.language.clone()));
        }

        Ok(())
    }

    /// Get the absolute root path (relative to config file location)
    pub fn resolve_root(&self, config_dir: &Path) -> PathBuf {
        if self.root.is_absolute() {
            self.root.clone()
        } else {
            config_dir.join(&self.root)
        }
    }

    /// Get file extension for the configured language
    pub fn file_extension(&self) -> &str {
        match self.language.as_str() {
            "typescript" => "ts",
            "python" => "py",
            "rust" => "rs",
            _ => unreachable!("validated in validate()"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = VsaConfig {
            version: 1,
            root: PathBuf::from("./src/contexts"),
            language: "typescript".to_string(),
            framework: None,
            contexts: HashMap::new(),
            validation: ValidationConfig::default(),
            patterns: PatternsConfig::default(),
        };

        assert!(config.validate().is_ok());
        assert_eq!(config.file_extension(), "ts");
    }

    #[test]
    fn test_invalid_version() {
        let config = VsaConfig {
            version: 999,
            root: PathBuf::from("./src"),
            language: "typescript".to_string(),
            framework: None,
            contexts: HashMap::new(),
            validation: ValidationConfig::default(),
            patterns: PatternsConfig::default(),
        };

        assert!(config.validate().is_err());
    }

    #[test]
    fn test_unsupported_language() {
        let config = VsaConfig {
            version: 1,
            root: PathBuf::from("./src"),
            language: "java".to_string(),
            framework: None,
            contexts: HashMap::new(),
            validation: ValidationConfig::default(),
            patterns: PatternsConfig::default(),
        };

        assert!(config.validate().is_err());
    }
}
