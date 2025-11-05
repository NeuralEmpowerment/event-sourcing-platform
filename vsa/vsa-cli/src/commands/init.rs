//! Initialize VSA configuration

use anyhow::Result;
use std::fs;
use std::path::PathBuf;

const CONFIG_TEMPLATE: &str = r#"# VSA Configuration
# See: https://github.com/yourusername/vsa for full documentation

vsa:
  version: 1
  root: ./src/contexts
  language: typescript

  # Optional: Event sourcing framework integration
  # framework:
  #   name: event-sourcing-platform
  #   base_types:
  #     domain_event:
  #       import: "@event-sourcing-platform/typescript"
  #       class: "BaseDomainEvent"
  #     aggregate:
  #       import: "@event-sourcing-platform/typescript"
  #       class: "AutoDispatchAggregate"

  # Validation rules
  validation:
    require_tests: true
    require_integration_events_in_shared: true
    max_nesting_depth: 3
    allow_nested_features: true

  # Pattern definitions (customize for your naming conventions)
  patterns:
    command: "*Command"
    event: "*Event"
    handler: "*Handler"
    query: "*Query"
    integration_event: "*IntegrationEvent"
    test: "*.test"

  # Context-specific configuration
  # contexts:
  #   warehouse:
  #     description: "Warehouse management bounded context"
  #   sales:
  #     description: "Sales and order management bounded context"
"#;

const CONFIG_TEMPLATE_WITH_FRAMEWORK: &str = r#"# VSA Configuration with Event Sourcing Platform Integration
# See: https://github.com/yourusername/vsa for full documentation

vsa:
  version: 1
  root: ./src/contexts
  language: typescript

  # Event sourcing framework integration
  framework:
    name: event-sourcing-platform
    base_types:
      domain_event:
        import: "@event-sourcing-platform/typescript"
        class: "BaseDomainEvent"
      aggregate:
        import: "@event-sourcing-platform/typescript"
        class: "AutoDispatchAggregate"
      command_handler:
        import: "@event-sourcing-platform/typescript"
        class: "CommandHandler"

  # Validation rules
  validation:
    require_tests: true
    require_integration_events_in_shared: true
    max_nesting_depth: 3
    allow_nested_features: true

  # Pattern definitions
  patterns:
    command: "*Command"
    event: "*Event"
    handler: "*Handler"
    query: "*Query"
    integration_event: "*IntegrationEvent"
    test: "*.test"
"#;

pub fn run(root: PathBuf, language: String, with_framework: bool) -> Result<()> {
    let config_path = PathBuf::from("vsa.yaml");

    if config_path.exists() {
        anyhow::bail!("Configuration file already exists: {}", config_path.display());
    }

    // Select template
    let template = if with_framework { CONFIG_TEMPLATE_WITH_FRAMEWORK } else { CONFIG_TEMPLATE };

    // Customize template
    let config = template.replace("./src/contexts", &root.to_string_lossy());
    let config = config.replace("typescript", &language);

    // Write config
    fs::write(&config_path, config)?;

    println!("✅ Created VSA configuration: {}", config_path.display());
    println!();
    println!("Next steps:");
    println!("  1. Review and customize vsa.yaml");
    println!("  2. Create your first context: mkdir -p {}/your-context", root.display());
    println!("  3. Generate a feature: vsa generate -c your-context -f your-feature");
    println!("  4. Validate structure: vsa validate");

    Ok(())
}
