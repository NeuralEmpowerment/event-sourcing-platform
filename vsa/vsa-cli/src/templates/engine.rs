//! Template rendering engine

use anyhow::Result;
use handlebars::Handlebars;
use vsa_core::VsaConfig;

use super::context::TemplateContext;
use super::typescript;

/// Template engine for code generation
pub struct TemplateEngine {
    handlebars: Handlebars<'static>,
    config: VsaConfig,
}

impl TemplateEngine {
    /// Create a new template engine
    pub fn new(config: VsaConfig) -> Result<Self> {
        let mut handlebars = Handlebars::new();
        handlebars.set_strict_mode(true);

        // Register TypeScript templates
        handlebars.register_template_string("ts_command", typescript::COMMAND_TEMPLATE)?;
        handlebars.register_template_string("ts_event", typescript::EVENT_TEMPLATE)?;
        handlebars.register_template_string("ts_handler", typescript::HANDLER_TEMPLATE)?;
        handlebars.register_template_string("ts_test", typescript::TEST_TEMPLATE)?;

        Ok(Self { handlebars, config })
    }

    /// Render command template
    pub fn render_command(&self, ctx: &TemplateContext) -> Result<String> {
        let template_name = match self.config.language.as_str() {
            "typescript" => "ts_command",
            _ => anyhow::bail!("Unsupported language: {}", self.config.language),
        };

        Ok(self.handlebars.render(template_name, &ctx)?)
    }

    /// Render event template
    pub fn render_event(&self, ctx: &TemplateContext) -> Result<String> {
        let template_name = match self.config.language.as_str() {
            "typescript" => "ts_event",
            _ => anyhow::bail!("Unsupported language: {}", self.config.language),
        };

        Ok(self.handlebars.render(template_name, &ctx)?)
    }

    /// Render handler template
    pub fn render_handler(&self, ctx: &TemplateContext) -> Result<String> {
        let template_name = match self.config.language.as_str() {
            "typescript" => "ts_handler",
            _ => anyhow::bail!("Unsupported language: {}", self.config.language),
        };

        Ok(self.handlebars.render(template_name, &ctx)?)
    }

    /// Render test template
    pub fn render_test(&self, ctx: &TemplateContext) -> Result<String> {
        let template_name = match self.config.language.as_str() {
            "typescript" => "ts_test",
            _ => anyhow::bail!("Unsupported language: {}", self.config.language),
        };

        Ok(self.handlebars.render(template_name, &ctx)?)
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
    fn test_engine_creation() {
        let config = create_test_config();
        let engine = TemplateEngine::new(config);
        assert!(engine.is_ok());
    }

    #[test]
    fn test_render_command() {
        let config = create_test_config();
        let engine = TemplateEngine::new(config.clone()).unwrap();
        
        let ctx = TemplateContext::from_feature_path(
            "create-product",
            "warehouse",
            &config,
        );

        let result = engine.render_command(&ctx);
        assert!(result.is_ok());
        
        let output = result.unwrap();
        assert!(output.contains("CreateProductCommand"));
        assert!(output.contains("export class"));
    }
}

