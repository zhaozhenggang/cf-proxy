#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EPUB to HTML Converter with Text-to-Speech Support

This script converts EPUB files to HTML format with integrated TTS functionality.
Features include:
- EPUB extraction and parsing
- HTML generation with embedded TTS controls
- Multi-language support
- Responsive design for mobile devices
- Keyboard shortcuts and accessibility features
"""

import os
import sys
import zipfile
import xml.etree.ElementTree as ET
from xml.dom import minidom
import html
import re
import json
import argparse
from pathlib import Path
import tempfile
import shutil
from urllib.parse import urljoin, urlparse
import base64
import mimetypes

class EPUBToHTMLConverter:
    """Main class for converting EPUB files to HTML with TTS support."""
    
    def __init__(self):
        self.output_dir = None
        self.temp_dir = None
        self.epub_data = {}
        self.toc = []
        
    def extract_epub(self, epub_path):
        """Extract EPUB file to temporary directory."""
        self.temp_dir = tempfile.mkdtemp()
        
        try:
            with zipfile.ZipFile(epub_path, 'r') as zip_ref:
                zip_ref.extractall(self.temp_dir)
            print(f"EPUB extracted to: {self.temp_dir}")
            return True
        except Exception as e:
            print(f"Error extracting EPUB: {e}")
            return False
    
    def parse_container(self):
        """Parse META-INF/container.xml to find OPF file."""
        container_path = os.path.join(self.temp_dir, 'META-INF', 'container.xml')
        
        if not os.path.exists(container_path):
            print("Container.xml not found")
            return None
            
        try:
            tree = ET.parse(container_path)
            root = tree.getroot()
            
            # Find OPF file path
            for rootfile in root.findall('.//{urn:oasis:names:tc:opendocument:xmlns:container}rootfile'):
                opf_path = rootfile.get('full-path')
                if opf_path:
                    return os.path.join(self.temp_dir, opf_path)
        except Exception as e:
            print(f"Error parsing container.xml: {e}")
            
        return None
    
    def parse_opf(self, opf_path):
        """Parse OPF file to get book metadata and structure."""
        try:
            tree = ET.parse(opf_path)
            root = tree.getroot()
            
            # Extract metadata
            metadata = {}
            ns = {'opf': 'http://www.idpf.org/2007/opf', 'dc': 'http://purl.org/dc/elements/1.1/'}
            
            title_elem = root.find('.//dc:title', ns)
            metadata['title'] = title_elem.text if title_elem is not None else 'Unknown Title'
            
            creator_elem = root.find('.//dc:creator', ns)
            metadata['author'] = creator_elem.text if creator_elem is not None else 'Unknown Author'
            
            lang_elem = root.find('.//dc:language', ns)
            metadata['language'] = lang_elem.text if lang_elem is not None else 'en'
            
            # Extract manifest
            manifest = {}
            for item in root.findall('.//opf:item', ns):
                item_id = item.get('id')
                href = item.get('href')
                media_type = item.get('media-type')
                if item_id and href:
                    manifest[item_id] = {
                        'href': href,
                        'media_type': media_type
                    }
            
            # Extract spine (reading order)
            spine = []
            for itemref in root.findall('.//opf:itemref', ns):
                idref = itemref.get('idref')
                if idref and idref in manifest:
                    spine.append(manifest[idref])
            
            self.epub_data = {
                'metadata': metadata,
                'manifest': manifest,
                'spine': spine,
                'opf_dir': os.path.dirname(opf_path)
            }
            
            print(f"Parsed EPUB: {metadata['title']} by {metadata['author']}")
            return True
            
        except Exception as e:
            print(f"Error parsing OPF file: {e}")
            return False
    
    def parse_ncx_toc(self):
        """Parse NCX file to extract table of contents."""
        try:
            # Find NCX file in manifest
            ncx_href = None
            for item_id, item_data in self.epub_data['manifest'].items():
                if item_data['media_type'] == 'application/x-dtbncx+xml':
                    ncx_href = item_data['href']
                    break
            
            if not ncx_href:
                return []
                
            ncx_path = os.path.join(self.epub_data['opf_dir'], ncx_href)
            if not os.path.exists(ncx_path):
                return []
                
            tree = ET.parse(ncx_path)
            root = tree.getroot()
            ns = {'ncx': 'http://www.daisy.org/z3986/2005/ncx/'}
            
            toc = []
            for navpoint in root.findall('.//ncx:navPoint', ns):
                label_elem = navpoint.find('.//ncx:text', ns)
                content_elem = navpoint.find('.//ncx:content', ns)
                
                if label_elem is not None and content_elem is not None:
                    toc.append({
                        'title': label_elem.text,
                        'src': content_elem.get('src')
                    })
            
            return toc
            
        except Exception as e:
            print(f"Error parsing NCX: {e}")
            return []
    
    def clean_html_content(self, html_content):
        """Clean and prepare HTML content for TTS."""
        # Remove script tags
        html_content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove style tags
        html_content = re.sub(r'<style[^>]*>.*?</style>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        
        # Fix relative URLs for images and links
        # This is a simplified version - in real implementation you might need more robust URL handling
        
        return html_content
    
    def extract_text_for_tts(self, html_content):
        """Extract text content and create TTS segments."""
        # Remove HTML tags but preserve structure
        text_content = re.sub(r'<[^>]+>', '', html_content)
        
        # Clean up whitespace
        text_content = re.sub(r'\s+', ' ', text_content).strip()
        
        # Split into sentences for TTS segments
        sentences = re.split(r'[.!?]+', text_content)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        return sentences
    
    def generate_tts_javascript(self):
        """Generate JavaScript code for TTS functionality."""
        return '''
// TTS (Text-to-Speech) Controller
class TTSController {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.utterance = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentSentenceIndex = 0;
        this.sentences = [];
        this.settings = {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
            lang: 'zh-CN'
        };
        this.init();
        this.loadSettings();
    }
    
    init() {
        this.createControlPanel();
        this.bindEvents();
        this.extractTextContent();
        this.loadPlaybackPosition();
    }
    
    createControlPanel() {
        const controlPanel = document.createElement('div');
        controlPanel.id = 'tts-control-panel';
        controlPanel.innerHTML = `
            <div class="tts-container">
                <div class="tts-main-controls">
                    <button id="tts-prev" title="上一句">⏮</button>
                    <button id="tts-play" title="播放/暂停">▶</button>
                    <button id="tts-next" title="下一句">⏭</button>
                    <button id="tts-stop" title="停止">⏹</button>
                </div>
                
                <div class="tts-progress-container">
                    <div class="tts-progress-info">
                        <span id="tts-current">0</span> / <span id="tts-total">0</span>
                    </div>
                    <div class="tts-progress-bar">
                        <input type="range" id="tts-progress" min="0" max="100" value="0">
                    </div>
                </div>
                
                <div class="tts-settings">
                    <div class="tts-setting">
                        <label>语速</label>
                        <input type="range" id="tts-rate" min="0.5" max="2" step="0.1" value="1">
                        <span id="tts-rate-value">1.0x</span>
                    </div>
                    <div class="tts-setting">
                        <label>音量</label>
                        <input type="range" id="tts-volume" min="0" max="1" step="0.1" value="1">
                        <span id="tts-volume-value">100%</span>
                    </div>
                    <div class="tts-setting">
                        <label>音调</label>
                        <input type="range" id="tts-pitch" min="0.5" max="2" step="0.1" value="1">
                        <span id="tts-pitch-value">1.0</span>
                    </div>
                </div>
                
                <div class="tts-language">
                    <select id="tts-lang">
                        <option value="zh-CN">中文</option>
                        <option value="en-US">English</option>
                        <option value="ja-JP">日本語</option>
                        <option value="ko-KR">한국어</option>
                    </select>
                </div>
            </div>
        `;
        
        document.body.appendChild(controlPanel);
    }
    
    bindEvents() {
        // Control buttons
        document.getElementById('tts-play').onclick = () => this.togglePlayPause();
        document.getElementById('tts-stop').onclick = () => this.stop();
        document.getElementById('tts-prev').onclick = () => this.previousSentence();
        document.getElementById('tts-next').onclick = () => this.nextSentence();
        
        // Settings
        document.getElementById('tts-rate').oninput = (e) => {
            this.settings.rate = parseFloat(e.target.value);
            document.getElementById('tts-rate-value').textContent = e.target.value + 'x';
            this.saveSettings();
        };
        
        document.getElementById('tts-volume').oninput = (e) => {
            this.settings.volume = parseFloat(e.target.value);
            document.getElementById('tts-volume-value').textContent = Math.round(e.target.value * 100) + '%';
            this.saveSettings();
        };
        
        document.getElementById('tts-pitch').oninput = (e) => {
            this.settings.pitch = parseFloat(e.target.value);
            document.getElementById('tts-pitch-value').textContent = e.target.value;
            this.saveSettings();
        };
        
        document.getElementById('tts-lang').onchange = (e) => {
            this.settings.lang = e.target.value;
            this.saveSettings();
        };
        
        // Progress bar
        document.getElementById('tts-progress').onchange = (e) => {
            const percentage = parseFloat(e.target.value);
            const targetIndex = Math.floor((percentage / 100) * this.sentences.length);
            this.jumpToSentence(targetIndex);
        };
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowLeft':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.previousSentence();
                    }
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.nextSentence();
                    }
                    break;
                case 'Escape':
                    this.stop();
                    break;
            }
        });
    }
    
    extractTextContent() {
        const content = document.querySelector('.epub-content, .content, main, article, body');
        if (!content) return;
        
        const textNodes = this.getTextNodes(content);
        this.sentences = textNodes
            .map(node => node.textContent.trim())
            .filter(text => text.length > 0)
            .join(' ')
            .split(/[.!?。！？]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
        
        document.getElementById('tts-total').textContent = this.sentences.length;
        document.getElementById('tts-progress').max = this.sentences.length;
    }
    
    getTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const parent = node.parentElement;
                    if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );
        
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        return textNodes;
    }
    
    togglePlayPause() {
        if (this.isPlaying) {
            if (this.isPaused) {
                this.synthesis.resume();
                this.isPaused = false;
            } else {
                this.synthesis.pause();
                this.isPaused = true;
            }
        } else {
            this.play();
        }
        
        this.updatePlayButton();
    }
    
    play() {
        if (this.sentences.length === 0) return;
        
        const text = this.sentences[this.currentSentenceIndex];
        if (!text) return;
        
        this.utterance = new SpeechSynthesisUtterance(text);
        this.utterance.rate = this.settings.rate;
        this.utterance.pitch = this.settings.pitch;
        this.utterance.volume = this.settings.volume;
        this.utterance.lang = this.settings.lang;
        
        this.utterance.onstart = () => {
            this.isPlaying = true;
            this.isPaused = false;
            this.highlightCurrentSentence();
            this.updatePlayButton();
        };
        
        this.utterance.onend = () => {
            this.isPlaying = false;
            this.isPaused = false;
            this.nextSentence();
            this.updatePlayButton();
        };
        
        this.utterance.onerror = () => {
            this.isPlaying = false;
            this.isPaused = false;
            this.updatePlayButton();
        };
        
        this.synthesis.speak(this.utterance);
        this.savePlaybackPosition();
    }
    
    stop() {
        this.synthesis.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        this.updatePlayButton();
        this.removeHighlight();
    }
    
    previousSentence() {
        if (this.currentSentenceIndex > 0) {
            this.stop();
            this.currentSentenceIndex--;
            this.updateProgress();
            this.play();
        }
    }
    
    nextSentence() {
        if (this.currentSentenceIndex < this.sentences.length - 1) {
            this.stop();
            this.currentSentenceIndex++;
            this.updateProgress();
            if (this.isPlaying) {
                this.play();
            }
        }
    }
    
    jumpToSentence(index) {
        if (index >= 0 && index < this.sentences.length) {
            const wasPlaying = this.isPlaying;
            this.stop();
            this.currentSentenceIndex = index;
            this.updateProgress();
            if (wasPlaying) {
                this.play();
            }
        }
    }
    
    updateProgress() {
        document.getElementById('tts-current').textContent = this.currentSentenceIndex + 1;
        document.getElementById('tts-progress').value = this.currentSentenceIndex;
        this.savePlaybackPosition();
    }
    
    updatePlayButton() {
        const button = document.getElementById('tts-play');
        if (this.isPlaying && !this.isPaused) {
            button.textContent = '⏸';
            button.title = '暂停';
        } else {
            button.textContent = '▶';
            button.title = '播放';
        }
    }
    
    highlightCurrentSentence() {
        this.removeHighlight();
        
        // This is a simplified highlighting - in a real implementation,
        // you would need more sophisticated text matching
        const content = document.querySelector('.epub-content, .content, main, article, body');
        if (content) {
            const text = this.sentences[this.currentSentenceIndex];
            if (text) {
                // Simple highlighting by wrapping matching text
                const innerHTML = content.innerHTML;
                const highlighted = innerHTML.replace(
                    new RegExp(this.escapeRegExp(text), 'i'),
                    `<span class="tts-highlight">${text}</span>`
                );
                if (highlighted !== innerHTML) {
                    content.innerHTML = highlighted;
                }
            }
        }
    }
    
    removeHighlight() {
        const highlighted = document.querySelectorAll('.tts-highlight');
        highlighted.forEach(el => {
            el.outerHTML = el.textContent;
        });
    }
    
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    }
    
    saveSettings() {
        localStorage.setItem('tts-settings', JSON.stringify(this.settings));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('tts-settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
            
            // Update UI
            document.getElementById('tts-rate').value = this.settings.rate;
            document.getElementById('tts-rate-value').textContent = this.settings.rate + 'x';
            document.getElementById('tts-volume').value = this.settings.volume;
            document.getElementById('tts-volume-value').textContent = Math.round(this.settings.volume * 100) + '%';
            document.getElementById('tts-pitch').value = this.settings.pitch;
            document.getElementById('tts-pitch-value').textContent = this.settings.pitch;
            document.getElementById('tts-lang').value = this.settings.lang;
        }
    }
    
    savePlaybackPosition() {
        const position = {
            page: window.location.pathname,
            sentence: this.currentSentenceIndex,
            timestamp: Date.now()
        };
        localStorage.setItem('tts-position', JSON.stringify(position));
    }
    
    loadPlaybackPosition() {
        const saved = localStorage.getItem('tts-position');
        if (saved) {
            const position = JSON.parse(saved);
            if (position.page === window.location.pathname) {
                this.currentSentenceIndex = position.sentence || 0;
                this.updateProgress();
            }
        }
    }
}

// Initialize TTS when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new TTSController();
    });
} else {
    new TTSController();
}
'''
    
    def generate_tts_css(self):
        """Generate CSS styles for TTS controls."""
        return '''
/* TTS Control Panel Styles */
#tts-control-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.tts-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 15px 20px;
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    gap: 20px;
    align-items: center;
}

.tts-main-controls {
    display: flex;
    gap: 8px;
}

.tts-main-controls button {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.tts-main-controls button:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
}

.tts-main-controls button:active {
    transform: scale(0.95);
}

.tts-progress-container {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 200px;
}

.tts-progress-info {
    font-size: 12px;
    text-align: center;
    opacity: 0.8;
}

.tts-progress-bar input[type="range"] {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.3);
    outline: none;
    border-radius: 2px;
    -webkit-appearance: none;
}

.tts-progress-bar input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.tts-progress-bar input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.tts-settings {
    display: flex;
    gap: 15px;
}

.tts-setting {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 80px;
}

.tts-setting label {
    font-size: 11px;
    opacity: 0.8;
}

.tts-setting input[type="range"] {
    width: 70px;
    height: 3px;
    background: rgba(255, 255, 255, 0.3);
    outline: none;
    border-radius: 2px;
    -webkit-appearance: none;
}

.tts-setting input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    cursor: pointer;
}

.tts-setting input[type="range"]::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    cursor: pointer;
    border: none;
}

.tts-setting span {
    font-size: 10px;
    opacity: 0.7;
    min-width: 40px;
    text-align: center;
}

.tts-language select {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 8px 12px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 12px;
    outline: none;
}

.tts-language select option {
    background: #333;
    color: white;
}

/* Text highlighting */
.tts-highlight {
    background: rgba(255, 255, 0, 0.3);
    padding: 2px 4px;
    border-radius: 3px;
    animation: pulse 1s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

/* Responsive design */
@media (max-width: 768px) {
    .tts-container {
        grid-template-columns: 1fr;
        gap: 15px;
        padding: 12px 15px;
    }
    
    .tts-main-controls {
        justify-content: center;
    }
    
    .tts-settings {
        justify-content: center;
        flex-wrap: wrap;
        gap: 10px;
    }
    
    .tts-progress-container {
        min-width: auto;
    }
    
    .tts-language {
        text-align: center;
    }
}

@media (max-width: 480px) {
    .tts-main-controls button {
        width: 35px;
        height: 35px;
        font-size: 14px;
    }
    
    .tts-setting {
        min-width: 60px;
    }
    
    .tts-setting input[type="range"] {
        width: 60px;
    }
}

/* Ensure content doesn't get hidden behind the panel */
body {
    padding-bottom: 120px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    #tts-control-panel {
        background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
    }
}
'''

    def convert_chapter_to_html(self, chapter_path, chapter_title="Chapter", chapter_index=0):
        """Convert a single EPUB chapter to HTML with TTS support."""
        try:
            with open(chapter_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Clean the content
            content = self.clean_html_content(content)
            
            # Extract text for TTS
            text_segments = self.extract_text_for_tts(content)
            
            # Generate complete HTML page with TTS
            html_template = f'''<!DOCTYPE html>
<html lang="{self.epub_data['metadata']['language']}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{html.escape(chapter_title)} - {html.escape(self.epub_data['metadata']['title'])}</title>
    <style>
        body {{
            font-family: Georgia, 'Times New Roman', serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fafafa;
            color: #333;
        }}
        
        .epub-header {{
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
        }}
        
        .epub-title {{
            font-size: 2.5em;
            color: #2c3e50;
            margin-bottom: 10px;
        }}
        
        .epub-author {{
            font-size: 1.2em;
            color: #7f8c8d;
            font-style: italic;
        }}
        
        .chapter-title {{
            font-size: 2em;
            color: #34495e;
            margin-bottom: 20px;
            text-align: center;
        }}
        
        .epub-content {{
            font-size: 18px;
            line-height: 1.8;
        }}
        
        .epub-content p {{
            margin-bottom: 1.2em;
        }}
        
        .epub-content h1, .epub-content h2, .epub-content h3 {{
            color: #2c3e50;
            margin-top: 2em;
            margin-bottom: 1em;
        }}
        
        .navigation {{
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #eee;
        }}
        
        .nav-button {{
            background: #3498db;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
            font-size: 16px;
            transition: background 0.3s;
        }}
        
        .nav-button:hover {{
            background: #2980b9;
        }}
        
        .nav-button:disabled {{
            background: #bdc3c7;
            cursor: not-allowed;
        }}
        
        @media (max-width: 600px) {{
            body {{
                padding: 15px;
            }}
            
            .epub-title {{
                font-size: 2em;
            }}
            
            .chapter-title {{
                font-size: 1.5em;
            }}
            
            .epub-content {{
                font-size: 16px;
            }}
        }}
        
        {self.generate_tts_css()}
    </style>
</head>
<body>
    <div class="epub-header">
        <h1 class="epub-title">{html.escape(self.epub_data['metadata']['title'])}</h1>
        <p class="epub-author">by {html.escape(self.epub_data['metadata']['author'])}</p>
    </div>
    
    <h2 class="chapter-title">{html.escape(chapter_title)}</h2>
    
    <div class="epub-content">
        {content}
    </div>
    
    <div class="navigation">
        <a href="chapter_{chapter_index - 1:03d}.html" class="nav-button" 
           {'style="visibility: hidden;"' if chapter_index == 0 else ''}>← Previous</a>
        <a href="index.html" class="nav-button">📚 Table of Contents</a>
        <a href="chapter_{chapter_index + 1:03d}.html" class="nav-button" 
           id="next-button">Next →</a>
    </div>

    <script>
        {self.generate_tts_javascript()}
        
        // Check if next chapter exists
        const nextButton = document.getElementById('next-button');
        if (nextButton) {{
            fetch(nextButton.href, {{method: 'HEAD'}})
                .then(response => {{
                    if (!response.ok) {{
                        nextButton.style.visibility = 'hidden';
                    }}
                }})
                .catch(() => {{
                    nextButton.style.visibility = 'hidden';
                }});
        }}
    </script>
</body>
</html>'''
            
            return html_template
            
        except Exception as e:
            print(f"Error converting chapter {chapter_path}: {e}")
            return None

    def generate_table_of_contents(self, chapter_files):
        """Generate a table of contents HTML page."""
        toc_html = f'''<!DOCTYPE html>
<html lang="{self.epub_data['metadata']['language']}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Table of Contents - {html.escape(self.epub_data['metadata']['title'])}</title>
    <style>
        body {{
            font-family: Georgia, 'Times New Roman', serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fafafa;
            color: #333;
        }}
        
        .book-header {{
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 3px solid #3498db;
        }}
        
        .book-title {{
            font-size: 3em;
            color: #2c3e50;
            margin-bottom: 15px;
        }}
        
        .book-author {{
            font-size: 1.3em;
            color: #7f8c8d;
            font-style: italic;
        }}
        
        .toc-container {{
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}
        
        .toc-title {{
            font-size: 2.2em;
            color: #2c3e50;
            margin-bottom: 30px;
            text-align: center;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 15px;
        }}
        
        .toc-list {{
            list-style: none;
            padding: 0;
        }}
        
        .toc-item {{
            margin-bottom: 15px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498db;
            transition: all 0.3s;
        }}
        
        .toc-item:hover {{
            background: #e3f2fd;
            transform: translateX(5px);
        }}
        
        .toc-link {{
            text-decoration: none;
            color: #2c3e50;
            font-size: 1.1em;
            font-weight: 500;
            display: block;
        }}
        
        .toc-link:hover {{
            color: #3498db;
        }}
        
        .chapter-number {{
            color: #7f8c8d;
            font-size: 0.9em;
            margin-right: 10px;
        }}
        
        .book-info {{
            background: #ecf0f1;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
            text-align: center;
        }}
        
        .tts-info {{
            background: #e8f5e8;
            border: 2px solid #4caf50;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }}
        
        .tts-info h3 {{
            color: #2e7d32;
            margin-top: 0;
        }}
        
        .tts-features {{
            list-style-type: none;
            padding: 0;
        }}
        
        .tts-features li {{
            padding: 5px 0;
            color: #388e3c;
        }}
        
        .tts-features li:before {{
            content: "🎵 ";
            margin-right: 8px;
        }}
        
        @media (max-width: 600px) {{
            body {{
                padding: 15px;
            }}
            
            .book-title {{
                font-size: 2.2em;
            }}
            
            .toc-container {{
                padding: 20px;
            }}
        }}
    </style>
</head>
<body>
    <div class="book-header">
        <h1 class="book-title">{html.escape(self.epub_data['metadata']['title'])}</h1>
        <p class="book-author">by {html.escape(self.epub_data['metadata']['author'])}</p>
    </div>
    
    <div class="toc-container">
        <h2 class="toc-title">📖 Table of Contents</h2>
        
        <ul class="toc-list">
'''
        
        for i, (filename, title) in enumerate(chapter_files):
            toc_html += f'''
            <li class="toc-item">
                <a href="{filename}" class="toc-link">
                    <span class="chapter-number">Chapter {i+1}</span>
                    {html.escape(title)}
                </a>
            </li>
'''
        
        toc_html += f'''
        </ul>
    </div>
    
    <div class="tts-info">
        <h3>🎵 Text-to-Speech Features</h3>
        <ul class="tts-features">
            <li>Press <kbd>Space</kbd> to play/pause</li>
            <li>Use <kbd>Ctrl + ←/→</kbd> to navigate sentences</li>
            <li>Adjustable speed, pitch, and volume</li>
            <li>Multi-language support</li>
            <li>Automatic position saving</li>
            <li>Sentence highlighting</li>
        </ul>
    </div>
    
    <div class="book-info">
        <p><strong>Language:</strong> {self.epub_data['metadata']['language']}</p>
        <p><strong>Total Chapters:</strong> {len(chapter_files)}</p>
        <p><strong>Generated:</strong> {html.escape(str(Path().resolve()))}</p>
    </div>
</body>
</html>'''
        
        return toc_html

    def convert_epub_to_html(self, epub_path, output_dir):
        """Main method to convert EPUB to HTML with TTS."""
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        print(f"Converting {epub_path} to {output_dir}")
        
        # Extract EPUB
        if not self.extract_epub(epub_path):
            return False
        
        try:
            # Parse container and OPF
            opf_path = self.parse_container()
            if not opf_path:
                print("Could not find OPF file")
                return False
            
            if not self.parse_opf(opf_path):
                return False
            
            # Parse table of contents
            self.toc = self.parse_ncx_toc()
            
            # Convert chapters
            chapter_files = []
            
            for i, spine_item in enumerate(self.epub_data['spine']):
                if spine_item['media_type'] == 'application/xhtml+xml':
                    chapter_path = os.path.join(self.epub_data['opf_dir'], spine_item['href'])
                    
                    if os.path.exists(chapter_path):
                        # Determine chapter title
                        chapter_title = f"Chapter {i+1}"
                        
                        # Try to find title in TOC
                        for toc_item in self.toc:
                            if spine_item['href'] in toc_item['src']:
                                chapter_title = toc_item['title']
                                break
                        
                        # Convert chapter
                        html_content = self.convert_chapter_to_html(
                            chapter_path, chapter_title, i
                        )
                        
                        if html_content:
                            output_filename = f"chapter_{i:03d}.html"
                            output_path = self.output_dir / output_filename
                            
                            with open(output_path, 'w', encoding='utf-8') as f:
                                f.write(html_content)
                            
                            chapter_files.append((output_filename, chapter_title))
                            print(f"Converted: {chapter_title} -> {output_filename}")
            
            # Generate table of contents
            if chapter_files:
                toc_html = self.generate_table_of_contents(chapter_files)
                toc_path = self.output_dir / "index.html"
                
                with open(toc_path, 'w', encoding='utf-8') as f:
                    f.write(toc_html)
                
                print(f"Generated table of contents: index.html")
            
            print(f"\\nConversion complete! Generated {len(chapter_files)} chapters.")
            print(f"Open {self.output_dir}/index.html in your browser to start reading with TTS.")
            
            return True
            
        finally:
            # Clean up temporary directory
            if self.temp_dir and os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)

def main():
    """Main function to handle command line arguments and run conversion."""
    parser = argparse.ArgumentParser(
        description='Convert EPUB files to HTML with Text-to-Speech support'
    )
    parser.add_argument('epub_file', help='Path to EPUB file')
    parser.add_argument('-o', '--output', default='./epub_html_output', 
                       help='Output directory (default: ./epub_html_output)')
    
    args = parser.parse_args()
    
    epub_path = Path(args.epub_file)
    if not epub_path.exists():
        print(f"Error: EPUB file not found: {epub_path}")
        sys.exit(1)
    
    if not epub_path.suffix.lower() == '.epub':
        print(f"Error: File must be an EPUB file: {epub_path}")
        sys.exit(1)
    
    converter = EPUBToHTMLConverter()
    
    if converter.convert_epub_to_html(str(epub_path), args.output):
        print("\\n✅ Success! Your EPUB has been converted to HTML with TTS support.")
    else:
        print("\\n❌ Conversion failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()