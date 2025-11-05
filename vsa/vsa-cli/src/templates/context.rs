//! Template context for code generation

use serde::Serialize;
use vsa_core::VsaConfig;

/// Context data for template rendering
#[derive(Debug, Clone, Serialize)]
pub struct TemplateContext {
    /// Feature name (e.g., "create-product")
    pub feature_name: String,

    /// Operation name in PascalCase (e.g., "CreateProduct")
    pub operation_name: String,

    /// Command class name (e.g., "CreateProductCommand")
    pub command_name: String,

    /// Event class name (e.g., "ProductCreatedEvent")
    pub event_name: String,

    /// Handler class name (e.g., "CreateProductHandler")
    pub handler_name: String,

    /// Aggregate class name (e.g., "ProductAggregate")
    pub aggregate_name: Option<String>,

    /// Test file name (e.g., "CreateProduct")
    pub test_name: String,

    /// Fields for the command/event
    pub fields: Vec<FieldInfo>,

    /// Framework integration context
    pub framework: Option<FrameworkContext>,

    /// File extension (ts, py, rs)
    pub extension: String,

    /// Context name (e.g., "warehouse")
    pub context_name: String,
}

/// Field information for templates
#[derive(Debug, Clone, Serialize)]
pub struct FieldInfo {
    /// Field name
    pub name: String,

    /// Field name in PascalCase (for getters)
    pub name_pascal: String,

    /// Field type
    pub field_type: String,

    /// Whether field is required
    pub is_required: bool,

    /// Default value (if any)
    pub default: Option<String>,
}

/// Framework integration context
#[derive(Debug, Clone, Serialize)]
pub struct FrameworkContext {
    /// Framework name
    pub name: String,

    /// Import path for base domain event
    pub domain_event_import: String,

    /// Base domain event class name
    pub domain_event_class: String,

    /// Import path for aggregate
    pub aggregate_import: Option<String>,

    /// Base aggregate class name
    pub aggregate_class: Option<String>,

    /// Import path for command handler
    pub handler_import: Option<String>,

    /// Base handler class name
    pub handler_class: Option<String>,
}

impl TemplateContext {
    /// Create context from feature path
    pub fn from_feature_path(
        feature_path: &str,
        context_name: &str,
        config: &VsaConfig,
    ) -> Self {
        let feature_name = feature_path
            .split('/')
            .next_back()
            .unwrap_or(feature_path)
            .to_string();

        let operation_name = Self::to_pascal_case(&feature_name);
        let command_name = format!("{operation_name}Command");
        let event_name = Self::to_event_name(&operation_name);
        let handler_name = format!("{operation_name}Handler");
        let test_name = operation_name.clone();

        let framework = config.framework.as_ref().map(|fw| FrameworkContext {
            name: fw.name.clone(),
            domain_event_import: fw
                .base_types
                .get("domain_event")
                .map(|bt| bt.import.clone())
                .unwrap_or_default(),
            domain_event_class: fw
                .base_types
                .get("domain_event")
                .map(|bt| bt.class.clone())
                .unwrap_or_else(|| "BaseDomainEvent".to_string()),
            aggregate_import: fw.base_types.get("aggregate").map(|bt| bt.import.clone()),
            aggregate_class: fw.base_types.get("aggregate").map(|bt| bt.class.clone()),
            handler_import: fw
                .base_types
                .get("command_handler")
                .map(|bt| bt.import.clone()),
            handler_class: fw
                .base_types
                .get("command_handler")
                .map(|bt| bt.class.clone()),
        });

        Self {
            feature_name,
            operation_name,
            command_name,
            event_name,
            handler_name,
            aggregate_name: None,
            test_name,
            fields: Vec::new(),
            framework,
            extension: config.file_extension().to_string(),
            context_name: context_name.to_string(),
        }
    }

    /// Add a field to the context
    pub fn add_field(&mut self, name: String, field_type: String, required: bool) {
        let name_pascal = Self::to_pascal_case(&name);
        self.fields.push(FieldInfo {
            name,
            name_pascal,
            field_type,
            is_required: required,
            default: None,
        });
    }

    /// Convert kebab-case to PascalCase
    fn to_pascal_case(s: &str) -> String {
        s.split('-')
            .filter(|part| !part.is_empty())
            .map(|part| {
                let mut chars = part.chars();
                match chars.next() {
                    None => String::new(),
                    Some(first) => first.to_uppercase().chain(chars).collect(),
                }
            })
            .collect()
    }

    /// Generate event name from operation (e.g., "CreateProduct" -> "ProductCreatedEvent")
    fn to_event_name(operation: &str) -> String {
        // Simple heuristic: if starts with Create/Update/Delete, move verb to past tense
        if let Some(rest) = operation.strip_prefix("Create") {
            format!("{rest}CreatedEvent")
        } else if let Some(rest) = operation.strip_prefix("Update") {
            format!("{rest}UpdatedEvent")
        } else if let Some(rest) = operation.strip_prefix("Delete") {
            format!("{rest}DeletedEvent")
        } else {
            format!("{operation}Event")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use vsa_core::config::{PatternsConfig, ValidationConfig};

    fn create_test_config() -> VsaConfig {
        VsaConfig {
            version: 1,
            root: std::path::PathBuf::from("./src/contexts"),
            language: "typescript".to_string(),
            framework: None,
            contexts: HashMap::new(),
            validation: ValidationConfig::default(),
            patterns: PatternsConfig::default(),
        }
    }

    #[test]
    fn test_to_pascal_case() {
        assert_eq!(TemplateContext::to_pascal_case("create-product"), "CreateProduct");
        assert_eq!(TemplateContext::to_pascal_case("update-inventory"), "UpdateInventory");
        assert_eq!(TemplateContext::to_pascal_case("single"), "Single");
    }

    #[test]
    fn test_to_event_name() {
        assert_eq!(
            TemplateContext::to_event_name("CreateProduct"),
            "ProductCreatedEvent"
        );
        assert_eq!(
            TemplateContext::to_event_name("UpdateInventory"),
            "InventoryUpdatedEvent"
        );
        assert_eq!(TemplateContext::to_event_name("ProcessOrder"), "ProcessOrderEvent");
    }

    #[test]
    fn test_from_feature_path() {
        let config = create_test_config();
        let ctx = TemplateContext::from_feature_path(
            "warehouse/products/create-product",
            "warehouse",
            &config,
        );

        assert_eq!(ctx.feature_name, "create-product");
        assert_eq!(ctx.operation_name, "CreateProduct");
        assert_eq!(ctx.command_name, "CreateProductCommand");
        assert_eq!(ctx.event_name, "ProductCreatedEvent");
        assert_eq!(ctx.handler_name, "CreateProductHandler");
        assert_eq!(ctx.context_name, "warehouse");
    }
}

