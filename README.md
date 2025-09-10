# EPUB to HTML Converter with Text-to-Speech (TTS)

A powerful Python tool that converts EPUB files to HTML format with integrated Text-to-Speech functionality. This tool creates accessible, interactive web pages that can read your books aloud using the browser's built-in TTS capabilities.

## 🌟 Features

### 📖 EPUB Processing
- **Complete EPUB Support**: Extracts and converts EPUB files to clean HTML
- **Chapter Organization**: Maintains book structure with proper chapter navigation
- **Metadata Preservation**: Keeps title, author, and language information
- **Table of Contents**: Generates interactive chapter index
- **Clean HTML Output**: Removes unnecessary tags while preserving formatting

### 🎵 Text-to-Speech Features
- **Browser-Native TTS**: Uses Web Speech API for high-quality speech synthesis
- **Multi-Language Support**: Supports Chinese, English, Japanese, Korean, and more
- **Voice Controls**: Play, pause, stop, previous/next sentence navigation
- **Customizable Playback**: Adjustable speed (0.5x-2.0x), pitch, and volume
- **Smart Highlighting**: Highlights currently spoken text
- **Position Memory**: Remembers playback position across sessions

### 🎮 User Interface
- **Fixed Bottom Player**: Persistent controls that don't interfere with reading
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Keyboard Shortcuts**: 
  - `Space`: Play/pause
  - `Ctrl + ←/→`: Previous/next sentence
  - `Esc`: Stop playback
- **Progress Tracking**: Visual progress bar with click-to-seek functionality
- **Beautiful Design**: Modern, accessible interface with dark mode support

## 🚀 Quick Start

### Installation

1. **Clone or download this repository**
```bash
git clone https://github.com/zhaozhenggang/cf-proxy.git
cd cf-proxy
```

2. **No additional dependencies required!** 
   The converter uses only Python standard library modules.

### Usage

#### Basic Conversion
```bash
python epub_to_html_with_tts.py your_book.epub
```

#### Specify Output Directory
```bash
python epub_to_html_with_tts.py your_book.epub -o /path/to/output
```

#### View Help
```bash
python epub_to_html_with_tts.py --help
```

### Example
```bash
# Convert an EPUB file
python epub_to_html_with_tts.py "Harry Potter.epub" -o "./my_books/harry_potter"

# Open the generated HTML in your browser
open ./my_books/harry_potter/index.html
```

## 📁 Output Structure

After conversion, you'll get:

```
output_directory/
├── index.html          # Table of contents with TTS info
├── chapter_000.html    # First chapter
├── chapter_001.html    # Second chapter
├── chapter_002.html    # Third chapter
└── ...                 # Additional chapters
```

## 🎯 How to Use TTS Features

1. **Open the HTML files** in any modern browser
2. **Start reading** - the TTS control panel appears at the bottom
3. **Use the controls**:
   - Click ▶️ to start reading aloud
   - Adjust speed, pitch, and volume with sliders
   - Use navigation buttons to skip between sentences
   - Drag the progress bar to jump to different parts

### Keyboard Shortcuts
- **Spacebar**: Toggle play/pause
- **Ctrl + Left Arrow**: Previous sentence
- **Ctrl + Right Arrow**: Next sentence  
- **Escape**: Stop playback

## 🌐 Browser Compatibility

The TTS functionality works in all modern browsers that support the Web Speech API:

- ✅ **Chrome/Chromium** (Recommended - best TTS quality)
- ✅ **Edge** (Excellent TTS support)
- ✅ **Safari** (Good TTS support)
- ✅ **Firefox** (Basic TTS support)
- ✅ **Mobile browsers** (iOS Safari, Chrome Mobile)

## 🛠️ Advanced Usage

### Language Detection
The converter automatically detects the book's language from EPUB metadata and sets the appropriate TTS language. Supported languages include:

- 🇨🇳 **Chinese (Simplified)**: `zh-CN`
- 🇺🇸 **English**: `en-US`
- 🇯🇵 **Japanese**: `ja-JP`
- 🇰🇷 **Korean**: `ko-KR`

You can manually change the language in the TTS control panel.

### Customization Options

#### Speed Control
- **0.5x**: Slow reading for learning
- **1.0x**: Normal speed (default)
- **2.0x**: Fast reading for review

#### Voice Settings
- **Pitch**: Adjust voice tone (0.5 - 2.0)
- **Volume**: Control playback volume (0% - 100%)

## 📱 Mobile Experience

The interface is fully responsive and optimized for mobile devices:

- **Touch-friendly controls**: Large, easy-to-tap buttons
- **Responsive layout**: Adapts to different screen sizes
- **Mobile TTS support**: Works with iOS and Android browsers
- **Gesture support**: Swipe and tap interactions

## 🔧 Technical Details

### Architecture
- **Python Backend**: Handles EPUB extraction and HTML generation
- **JavaScript Frontend**: Manages TTS functionality and user interface
- **CSS Styling**: Provides responsive, accessible design
- **Local Storage**: Saves user preferences and reading position

### Security & Privacy
- **No server required**: Runs entirely in the browser after conversion
- **Local processing**: All TTS happens on your device
- **No data transmission**: Your books never leave your computer
- **Offline capable**: Works without internet connection

## 🤝 Contributing

We welcome contributions! Here are some ways you can help:

### Bug Reports
If you find a bug, please create an issue with:
- EPUB file details (if possible)
- Browser and version
- Steps to reproduce
- Expected vs actual behavior

### Feature Requests
Ideas for new features:
- Additional language support
- Voice selection options  
- Reading speed analytics
- Bookmark functionality
- Export options

### Development
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Web Speech API**: For providing browser-native TTS capabilities
- **EPUB specification**: For the standardized ebook format
- **Python community**: For excellent standard library modules
- **Contributors**: Everyone who helps improve this tool

## 📞 Support

If you need help or have questions:

1. **Check the documentation** above
2. **Search existing issues** in the GitHub repository
3. **Create a new issue** with detailed information
4. **Join discussions** in the repository

## 🔄 Version History

### v1.0.0 (Current)
- ✨ Initial release
- 📖 Complete EPUB to HTML conversion
- 🎵 Full TTS integration with Web Speech API
- 📱 Responsive design for all devices
- ⌨️ Keyboard shortcuts support
- 💾 Position memory and settings persistence
- 🌍 Multi-language support

---

**Happy Reading! 📚🎵**

Transform your EPUB collection into interactive, voice-enabled web books that you can enjoy anywhere, anytime!