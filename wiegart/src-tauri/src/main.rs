// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::api::dialog::FileDialogBuilder;
use tauri::api::path::download_dir;
use std::fs::write;

// This is the command that receives the SVG content from the frontend.
#[tauri::command]
fn save_svg(svg_content: String) {
    // We use a FileDialogBuilder to open a native "Save File" dialog.
    FileDialogBuilder::new()
        // Suggest a default directory (e.g., the user's Downloads folder).
        .set_directory(&download_dir().unwrap())
        // Suggest a default file name.
        .set_file_name("vectorized-image.svg")
        // Add a filter to show only SVG files.
        .add_filter("Scalable Vector Graphic", &["svg"])
        // The `pick_file` method is asynchronous, so we provide a closure
        // that will be executed once the user selects a file path.
        .save_file(move |file_path| {
            if let Some(path) = file_path {
                // If the user selected a path, we attempt to write the SVG content to it.
                match write(&path, svg_content) {
                    Ok(_) => println!("File saved successfully to: {:?}", path),
                    Err(e) => eprintln!("Failed to save file: {}", e),
                }
            } else {
                println!("User cancelled the save dialog.");
            }
        });
}

fn main() {
    tauri::Builder::default()
        // This registers our `save_svg` command so the frontend can call it.
        .invoke_handler(tauri::generate_handler![save_svg])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}