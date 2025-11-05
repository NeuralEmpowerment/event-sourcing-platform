//! Generate new features

use anyhow::Result;
use console::style;
use std::fs;
use std::path::Path;
use vsa_core::VsaConfig;

use crate::templates::{TemplateContext, TemplateEngine};

pub fn run(
    config_path: &Path,
    context: String,
    feature: String,
    _feature_type: Option<String>,
    _interactive: bool,
) -> Result<()> {
    println!("🚧 Generating feature '{feature}' in context '{context}'...");
    println!();

    // Load configuration
    let config = VsaConfig::from_file(config_path)?;
    let config_dir = config_path.parent().unwrap_or_else(|| Path::new("."));
    let root = config.resolve_root(config_dir);

    // Create template context
    let mut ctx = TemplateContext::from_feature_path(&feature, &context, &config);
    
    // Add example fields (in interactive mode, these would be prompted)
    ctx.add_field("id".to_string(), "string".to_string(), true);

    // Create template engine
    let engine = TemplateEngine::new(config.clone())?;

    // Generate feature directory
    let feature_path = root.join(&context).join(&feature);
    fs::create_dir_all(&feature_path)?;

    // Generate files
    let command_file = feature_path.join(format!("{}.{}", ctx.command_name, ctx.extension));
    let event_file = feature_path.join(format!("{}.{}", ctx.event_name, ctx.extension));
    let handler_file = feature_path.join(format!("{}.{}", ctx.handler_name, ctx.extension));
    let test_file = feature_path.join(format!("{}.test.{}", ctx.test_name, ctx.extension));

    // Render and write templates
    fs::write(&command_file, engine.render_command(&ctx)?)?;
    fs::write(&event_file, engine.render_event(&ctx)?)?;
    fs::write(&handler_file, engine.render_handler(&ctx)?)?;
    fs::write(&test_file, engine.render_test(&ctx)?)?;

    // Print success message
    println!("{}", style("✅ Created feature files:").green().bold());
    println!("  {} {}", style("├─").dim(), command_file.display());
    println!("  {} {}", style("├─").dim(), event_file.display());
    println!("  {} {}", style("├─").dim(), handler_file.display());
    println!("  {} {}", style("└─").dim(), test_file.display());
    println!();
    println!("{}", style("💡 Next steps:").bold());
    println!("  1. Implement business logic in {}", ctx.handler_name);
    println!("  2. Add tests in {}.test.{}", ctx.test_name, ctx.extension);
    println!("  3. Run: vsa validate");

    Ok(())
}
