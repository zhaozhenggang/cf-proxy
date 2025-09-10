#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example usage of EPUB to HTML converter with TTS

This script demonstrates how to use the EPUBToHTMLConverter class
to convert EPUB files to HTML with TTS functionality.
"""

import os
import sys
from pathlib import Path
from epub_to_html_with_tts import EPUBToHTMLConverter

def main():
    """Example usage of the EPUB converter."""
    
    print("📚 EPUB to HTML with TTS - Example Usage")
    print("=" * 50)
    
    # Example 1: Basic conversion
    print("\n🔸 Example 1: Basic Conversion")
    converter = EPUBToHTMLConverter()
    
    # Uncomment and modify the path to test with a real EPUB file
    # epub_file = "path/to/your/book.epub"
    # output_dir = "./converted_books/my_book"
    # 
    # if Path(epub_file).exists():
    #     success = converter.convert_epub_to_html(epub_file, output_dir)
    #     if success:
    #         print(f"✅ Conversion completed! Check: {output_dir}/index.html")
    #     else:
    #         print("❌ Conversion failed!")
    # else:
    #     print(f"📁 EPUB file not found: {epub_file}")
    
    print("To use this converter:")
    print("1. Place your EPUB file in the same directory")
    print("2. Uncomment the lines above and update the file path")
    print("3. Run this script: python example_usage.py")
    
    # Example 2: Batch conversion
    print("\n🔸 Example 2: Batch Conversion")
    print("def convert_multiple_epubs():")
    print("    epub_files = ['book1.epub', 'book2.epub', 'book3.epub']")
    print("    ")
    print("    for epub_file in epub_files:")
    print("        if Path(epub_file).exists():")
    print("            book_name = Path(epub_file).stem")
    print("            output_dir = f'./books/{book_name}'")
    print("            converter.convert_epub_to_html(epub_file, output_dir)")
    print("            print(f'✅ Converted: {epub_file}')")
    
    # Example 3: Using command line
    print("\n🔸 Example 3: Command Line Usage")
    print("# Convert single EPUB:")
    print("python epub_to_html_with_tts.py your_book.epub")
    print("")
    print("# Convert with custom output directory:")
    print("python epub_to_html_with_tts.py your_book.epub -o ./custom_output")
    print("")
    print("# Get help:")
    print("python epub_to_html_with_tts.py --help")
    
    print("\n🎵 TTS Features Available:")
    features = [
        "🎮 Play/Pause/Stop controls",
        "⚡ Adjustable speed (0.5x - 2.0x)",
        "🔊 Volume and pitch control",
        "🌍 Multi-language support",
        "📱 Mobile responsive design",
        "⌨️  Keyboard shortcuts (Space, Ctrl+←/→)",
        "💾 Automatic position saving",
        "✨ Text highlighting during playback"
    ]
    
    for feature in features:
        print(f"   {feature}")
    
    print(f"\n🌐 Open the generated HTML files in any modern browser!")
    print(f"📖 The TTS controls will appear at the bottom of each page.")

if __name__ == "__main__":
    main()