// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::AppHandle;
// Import the FilePath type and the DialogExt trait
use tauri_plugin_dialog::{DialogExt, FilePath};
use std::fs::write;
// Import the standard PathBuf for file system operations
use std::path::PathBuf;

// This is the command that receives the SVG content from the frontend.
#[tauri::command]
fn save_svg(app: AppHandle, svg_content: String) {
    // We use the dialog plugin to open a native "Save File" dialog.
    app.dialog()
        .file()
        .set_title("Save SVG File")
        .set_file_name("vectorized-image.svg")
        .add_filter("Scalable Vector Graphic", &["svg"])
        .save_file(move |file_path: Option<FilePath>| {
            if let Some(path) = file_path {
                // The user selected a path. We convert it to a string first, then to a PathBuf.
                let path_buf = PathBuf::from(path.to_string());
                match write(&path_buf, svg_content) {
                    Ok(_) => {
                        println!("File saved successfully to: {:?}", path_buf);
                    },
                    Err(e) => {
                        eprintln!("Failed to save file: {}", e);
                    },
                }
            } else {
                println!("User cancelled the save dialog.");
            }
        });
}

fn main() {
    tauri::Builder::default()
        // Add the dialog plugin
        .plugin(tauri_plugin_dialog::init())
        // This registers our `save_svg` command so the frontend can call it.
        .invoke_handler(tauri::generate_handler![save_svg])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

