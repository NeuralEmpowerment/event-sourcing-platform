//! Validate VSA structure

use anyhow::Result;
use console::style;
use std::path::Path;
use vsa_core::{Validator, VsaConfig};

pub fn run(config_path: &Path, _fix: bool, _watch: bool) -> Result<()> {
    println!("🔍 Validating VSA structure...");
    println!();

    // Load configuration
    let config = VsaConfig::from_file(config_path)?;
    let config_dir = config_path.parent().unwrap_or_else(|| Path::new("."));
    let root = config.resolve_root(config_dir);

    println!("📁 Root: {}", root.display());
    println!("🗣️  Language: {}", config.language);
    println!();

    // Create validator
    let validator = Validator::new(config, root);

    // Run validation
    let report = validator.validate()?;

    // Print results
    if report.errors.is_empty() && report.warnings.is_empty() {
        println!("{}", style("✅ All checks passed!").green().bold());
        return Ok(());
    }

    // Print errors
    if !report.errors.is_empty() {
        println!("{}", style(format!("❌ {} Error(s)", report.errors.len())).red().bold());
        for error in &report.errors {
            println!("  {} {}", style("×").red(), error.message);
            println!("    at: {}", error.path.display());
        }
        println!();
    }

    // Print warnings
    if !report.warnings.is_empty() {
        println!("{}", style(format!("⚠️  {} Warning(s)", report.warnings.len())).yellow().bold());
        for warning in &report.warnings {
            println!("  {} {}", style("!").yellow(), warning.message);
            println!("    at: {}", warning.path.display());
        }
        println!();
    }

    if report.is_valid() {
        println!("{}", style("✅ Validation passed with warnings").green());
        Ok(())
    } else {
        anyhow::bail!("Validation failed with {} error(s)", report.errors.len());
    }
}
