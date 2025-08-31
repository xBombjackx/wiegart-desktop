// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, FilePath};
use std::fs::write;
use std::path::PathBuf;

// This is the command that receives the SVG content from the frontend.
#[tauri::command]
fn save_svg(app: AppHandle, svg_content: String) {
    app.dialog()
        .file()
        .set_title("Save SVG File")
        .set_file_name("vectorized-image.svg")
        .add_filter("Scalable Vector Graphic", &["svg"])
        .save_file(move |file_path: Option<FilePath>| {
            if let Some(path) = file_path {
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

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}


fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![save_svg, greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}