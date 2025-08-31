// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use std::fs::write;
use std::path::PathBuf;

use potrace::{Potrace, PotraceParameters};
use image::{self, GenericImageView};

#[tauri::command]
async fn trace_with_potrace(image_path: String, color: String) -> Result<String, String> {
    // 1. Load the image from the provided path
    let img = match image::open(&image_path) {
        Ok(img) => img,
        Err(e) => return Err(format!("Failed to open image: {}", e)),
    };

    // 2. Create a monochrome bitmap for the specified color
    let (width, height) = img.dimensions();
    let mut bitmap = vec![0u8; (width * height) as usize];

    let Ok(target_color) = hex::decode(color.replace("#", "")) else {
        return Err(format!("Invalid hex color: {}", color));
    };

    for y in 0..height {
        for x in 0..width {
            let pixel = img.get_pixel(x, y);
            if pixel[0] == target_color[0] && pixel[1] == target_color[1] && pixel[2] == target_color[2] {
                bitmap[(y * width + x) as usize] = 1; // Black pixel
            } else {
                bitmap[(y * width + x) as usize] = 0; // White pixel
            }
        }
    }

    // 3. Set Potrace parameters and trace
    let params = PotraceParameters::default();
    let potrace_bitmap = Potrace::new(&bitmap, width as i32, height as i32, &params);

    // 4. Get the path data
    let paths = potrace_bitmap.get_paths();
    let svg_data = paths.iter()
        .map(|path| path.get_svg_path(0.0, 0.0, 1.0, 1.0))
        .collect::<Vec<String>>()
        .join(" ");

    Ok(svg_data)
}


// This command receives the SVG content from the frontend and prompts the user to save it.
#[tauri::command]
fn save_svg(app: AppHandle, svg_content: String) {
    let dialog = app.dialog();
    dialog
        .file()
        .set_title("Save SVG File")
        .set_file_name("vectorized-image.svg")
        .add_filter("Scalable Vector Graphic", &["svg"])
        .save_file(move |file_path| {
            if let Some(path) = file_path {
                // The path from the dialog can be a string or a PathBuf, we ensure it's a PathBuf
                let path_buf = PathBuf::from(path.to_string());
                // Write the file, and if it fails, log the error.
                if let Err(e) = write(&path_buf, &svg_content) {
                    eprintln!("Failed to save SVG: {}", e);
                }
            }
        });
}


// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![save_svg, trace_with_potrace])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}