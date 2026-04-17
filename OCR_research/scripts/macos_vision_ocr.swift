import AppKit
import Foundation
import PDFKit
import Vision

struct PageResult: Codable {
    let page: Int
    let text: String
}

struct OCRResult: Codable {
    let backend: String
    let pages: [PageResult]
}

func makeTextRequest() -> VNRecognizeTextRequest {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.automaticallyDetectsLanguage = true
    request.usesCPUOnly = true
    return request
}

func renderCGImage(from page: PDFPage, scale: CGFloat = 2.2) -> CGImage? {
    let bounds = page.bounds(for: .mediaBox)
    let width = max(Int(bounds.width * scale), 1)
    let height = max(Int(bounds.height * scale), 1)
    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else { return nil }
    guard let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        return nil
    }

    context.setFillColor(NSColor.white.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height)))
    context.saveGState()
    context.translateBy(x: 0, y: CGFloat(height))
    context.scaleBy(x: scale, y: -scale)
    page.draw(with: .mediaBox, to: context)
    context.restoreGState()
    return context.makeImage()
}

func recognizedText(from request: VNRecognizeTextRequest) -> String {
    let lines = (request.results ?? []).compactMap { observation -> String? in
        observation.topCandidates(1).first?.string
    }

    return lines.joined(separator: "\n")
}

func recognizeText(in cgImage: CGImage) throws -> String {
    let request = makeTextRequest()
    let handler = VNImageRequestHandler(cgImage: cgImage)
    try handler.perform([request])
    return recognizedText(from: request)
}

func ocrImage(at url: URL) throws -> OCRResult {
    let request = makeTextRequest()
    let handler = VNImageRequestHandler(url: url)
    try handler.perform([request])
    let text = recognizedText(from: request)
    return OCRResult(backend: "macos-vision-dev", pages: [PageResult(page: 1, text: text)])
}

func ocrPDF(at url: URL) throws -> OCRResult {
    guard let document = PDFDocument(url: url) else {
        throw NSError(domain: "OCR", code: 2, userInfo: [
            NSLocalizedDescriptionKey: "Could not open PDF."
        ])
    }

    var pages: [PageResult] = []
    for index in 0..<document.pageCount {
        guard let page = document.page(at: index) else { continue }
        guard let cgImage = renderCGImage(from: page) else { continue }
        let text = try recognizeText(in: cgImage)
        pages.append(PageResult(page: index + 1, text: text))
    }

    return OCRResult(backend: "macos-vision-dev", pages: pages)
}

if CommandLine.arguments.count < 2 {
    fputs("Usage: swift macos_vision_ocr.swift <file>\n", stderr)
    exit(1)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let pathExtension = inputURL.pathExtension.lowercased()

do {
    let result: OCRResult
    if pathExtension == "pdf" {
        result = try ocrPDF(at: inputURL)
    } else {
        result = try ocrImage(at: inputURL)
    }

    let encoded = try JSONEncoder().encode(result)
    if let json = String(data: encoded, encoding: .utf8) {
        print(json)
    } else {
        throw NSError(domain: "OCR", code: 3, userInfo: [
            NSLocalizedDescriptionKey: "Could not encode OCR result."
        ])
    }
} catch {
    fputs("\(String(describing: error))\n", stderr)
    exit(1)
}
