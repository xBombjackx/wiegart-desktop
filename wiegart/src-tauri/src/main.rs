// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use std::fs::write;
use std::path::PathBuf;

// This command receives the SVG content from the frontend and prompts the user to save it.
// It is now async and returns a Result so that frontend can get specific error messages.
#[tauri::command]
async fn save_svg(app: AppHandle, svg_content: String) -> Result<(), String> {
    let file_path = app.dialog()
        .file()
        .set_title("Save SVG File")
        .set_file_name("vectorized-image.svg")
        .add_filter("Scalable Vector Graphic", &["svg"])
        .save_file()
        .await;

    if let Some(path) = file_path {
        // The path from the dialog can be a string or a PathBuf, we ensure it's a PathBuf
        let path_buf = PathBuf::from(path.to_string());
        // Write the file, and if it fails, map the error to a String to be sent to the frontend.
        write(&path_buf, svg_content).map_err(|e| e.to_string())
    } else {
        // If the user cancels the dialog, `file_path` is None. This is not an error.
        Ok(())
    }
}


// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![save_svg])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}