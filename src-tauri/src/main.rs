// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod services;
mod utils;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::metadata::get_video_metadata,
            commands::ffmpeg::execute_split,
            commands::file::select_output_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
