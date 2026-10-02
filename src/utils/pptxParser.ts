// ============================================================================
// EDTECHRA LIBRARY: High-Fidelity Client-Side PPTX Slide Parser
// Extracts structured slide data, titles, bullets, paragraphs, and embedded images
// using JSZip and native DOMParser with zero external server dependencies.
// ============================================================================

import JSZip from 'jszip';
import { ParsedPptxDeck, ParsedPptxSlide } from '@/types/library';

/**
 * Parses a PPTX file ArrayBuffer into structured slides.
 */
export async function parsePptx(fileBuffer: ArrayBuffer, fileName: string = 'Presentation'): Promise<ParsedPptxDeck> {
  const zip = await JSZip.loadAsync(fileBuffer);
  const domParser = new DOMParser();

  // 1. Discover slide relationships from ppt/_rels/presentation.xml.rels
  const presentationRelsXml = await zip.file('ppt/_rels/presentation.xml.rels')?.async('text');
  const slideRelMap = new Map<string, string>(); // rId -> target slide filename

  if (presentationRelsXml) {
    const relsDoc = domParser.parseFromString(presentationRelsXml, 'application/xml');
    const relationships = relsDoc.getElementsByTagName('Relationship');
    for (let i = 0; i < relationships.length; i++) {
      const rel = relationships[i];
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      const type = rel.getAttribute('Type') || '';
      if (id && target && type.includes('slide')) {
        // Target can be 'slides/slide1.xml' or '/ppt/slides/slide1.xml'
        const cleanTarget = target.startsWith('ppt/') ? target : `ppt/${target.replace(/^\//, '')}`;
        slideRelMap.set(id, cleanTarget);
      }
    }
  }

  // 2. Discover slide ordering from ppt/presentation.xml
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('text');
  const orderedSlidePaths: string[] = [];

  if (presentationXml) {
    const presDoc = domParser.parseFromString(presentationXml, 'application/xml');
    const sldIds = presDoc.getElementsByTagName('p:sldId');
    for (let i = 0; i < sldIds.length; i++) {
      const rId = sldIds[i].getAttribute('r:id');
      if (rId && slideRelMap.has(rId)) {
        orderedSlidePaths.push(slideRelMap.get(rId)!);
      }
    }
  }

  // Fallback: if presentation.xml didn't list them, find all ppt/slides/slide*.xml files
  if (orderedSlidePaths.length === 0) {
    const slideFileNames = Object.keys(zip.files).filter((k) =>
      /^ppt\/slides\/slide\d+\.xml$/i.test(k)
    );
    // Sort naturally: slide1, slide2, slide10
    slideFileNames.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
    orderedSlidePaths.push(...slideFileNames);
  }

  // 3. Process each slide
  const slides: ParsedPptxSlide[] = [];

  for (let idx = 0; idx < orderedSlidePaths.length; idx++) {
    const slidePath = orderedSlidePaths[idx];
    const slideXml = await zip.file(slidePath)?.async('text');
    if (!slideXml) continue;

    const slideDoc = domParser.parseFromString(slideXml, 'application/xml');

    // 3a. Extract images mapped in this slide's rels file
    const slideRelsPath = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
    const slideRelsXml = await zip.file(slideRelsPath)?.async('text');
    const imageMap = new Map<string, string>(); // rId -> media file path

    if (slideRelsXml) {
      const relsDoc = domParser.parseFromString(slideRelsXml, 'application/xml');
      const relationships = relsDoc.getElementsByTagName('Relationship');
      for (let r = 0; r < relationships.length; r++) {
        const rel = relationships[r];
        const id = rel.getAttribute('Id');
        const target = rel.getAttribute('Target') || '';
        const type = rel.getAttribute('Type') || '';
        if (id && type.includes('image')) {
          // Normalise path to ppt/media/...
          const cleanMedia = target.includes('media/')
            ? `ppt/media/${target.split('media/').pop()}`
            : target;
          imageMap.set(id, cleanMedia);
        }
      }
    }

    // Convert slide media files to Object URLs
    const slideImages: string[] = [];
    for (const [_, mediaPath] of imageMap.entries()) {
      const mediaFile = zip.file(mediaPath);
      if (mediaFile) {
        try {
          const blob = await mediaFile.async('blob');
          const objectUrl = URL.createObjectURL(blob);
          slideImages.push(objectUrl);
        } catch (e) {
          console.warn('[pptxParser] Failed to extract image:', mediaPath, e);
        }
      }
    }

    // 3b. Extract title, paragraphs, and bullet points
    let title: string | undefined;
    let subtitle: string | undefined;
    const content: string[] = [];
    const bulletPoints: string[] = [];

    // Shapes in slide: <p:sp>
    const shapes = slideDoc.getElementsByTagName('p:sp');
    for (let s = 0; s < shapes.length; s++) {
      const shape = shapes[s];
      const ph = shape.getElementsByTagName('p:ph')[0];
      const phType = ph?.getAttribute('type') || '';

      const isTitleShape = phType === 'title' || phType === 'ctrTitle';
      const isSubTitleShape = phType === 'subTitle';

      // Read paragraphs in this shape
      const paragraphs = shape.getElementsByTagName('a:p');
      const shapeParagraphTexts: string[] = [];

      for (let p = 0; p < paragraphs.length; p++) {
        const pElem = paragraphs[p];
        const textRuns = pElem.getElementsByTagName('a:t');
        let fullParaText = '';
        for (let t = 0; t < textRuns.length; t++) {
          fullParaText += textRuns[t].textContent || '';
        }
        fullParaText = fullParaText.trim();
        if (!fullParaText) continue;

        // Check if paragraph is styled as a bullet point
        const pPr = pElem.getElementsByTagName('a:pPr')[0];
        const hasBullet = pPr && (pPr.getElementsByTagName('a:buChar').length > 0 || pPr.getElementsByTagName('a:buAutoNum').length > 0 || pPr.getAttribute('lvl') !== null);

        if (isTitleShape && !title) {
          title = fullParaText;
        } else if (isSubTitleShape && !subtitle) {
          subtitle = fullParaText;
        } else if (hasBullet) {
          bulletPoints.push(fullParaText);
        } else {
          shapeParagraphTexts.push(fullParaText);
        }
      }

      if (!isTitleShape && !isSubTitleShape && shapeParagraphTexts.length > 0) {
        content.push(...shapeParagraphTexts);
      }
    }

    // Fallback: If title wasn't found by placeholder type, use the first content line
    if (!title && content.length > 0) {
      title = content.shift();
    } else if (!title && bulletPoints.length > 0) {
      title = bulletPoints.shift();
    }

    // Final fallback text extraction: search all <a:t> elements if shape parsing yielded nothing
    if (!title && content.length === 0 && bulletPoints.length === 0) {
      const allTextNodes = slideDoc.getElementsByTagName('a:t');
      const fallbackLines: string[] = [];
      for (let n = 0; n < allTextNodes.length; n++) {
        const txt = (allTextNodes[n].textContent || '').trim();
        if (txt) fallbackLines.push(txt);
      }
      if (fallbackLines.length > 0) {
        title = fallbackLines[0];
        content.push(...fallbackLines.slice(1));
      }
    }

    slides.push({
      slideNumber: idx + 1,
      title: title || `Slide ${idx + 1}`,
      subtitle,
      content,
      bulletPoints,
      images: slideImages
    });
  }

  // Safety fallback if file had no recognizable slides
  if (slides.length === 0) {
    slides.push({
      slideNumber: 1,
      title: fileName.replace(/\.[^/.]+$/, ''),
      content: ['Presentation slide loaded.'],
      bulletPoints: [],
      images: []
    });
  }

  return {
    title: slides[0]?.title || fileName.replace(/\.[^/.]+$/, ''),
    totalSlides: slides.length,
    slides
  };
}

/**
 * In-memory cache for extracted PPTX covers from URLs so each presentation is only parsed once
 */
const pptxCoverCache = new Map<string, string>();

export interface ExtractedPptxCover {
  file: File;
  blob: Blob;
  url: string;
}

/**
 * Extracts the first page / slide of a PPTX file to use as its cover image.
 * 1. Checks slide 1 embedded images (standard for exported graphic presentations)
 * 2. Checks standard PowerPoint thumbnail (docProps/thumbnail.jpeg or .png)
 * 3. Fallback: Renders a high-resolution 16:9 canvas using the first slide's title and contents
 */
export async function extractPptxCover(
  fileOrBuffer: File | Blob | ArrayBuffer,
  fileName: string = 'presentation'
): Promise<ExtractedPptxCover | null> {
  try {
    const arrayBuffer =
      fileOrBuffer instanceof ArrayBuffer
        ? fileOrBuffer
        : await (fileOrBuffer as Blob).arrayBuffer();

    const zip = await JSZip.loadAsync(arrayBuffer);
    const domParser = new DOMParser();

    // 1. Check slide 1 relationships
    let slide1Path = 'ppt/slides/slide1.xml';
    const presentationRelsXml = await zip.file('ppt/_rels/presentation.xml.rels')?.async('text');
    const presentationXml = await zip.file('ppt/presentation.xml')?.async('text');

    if (presentationRelsXml && presentationXml) {
      const presDoc = domParser.parseFromString(presentationXml, 'application/xml');
      const firstSldId = presDoc.getElementsByTagName('p:sldId')[0];
      const rId = firstSldId?.getAttribute('r:id');

      if (rId) {
        const relsDoc = domParser.parseFromString(presentationRelsXml, 'application/xml');
        const relationships = relsDoc.getElementsByTagName('Relationship');
        for (let i = 0; i < relationships.length; i++) {
          if (relationships[i].getAttribute('Id') === rId) {
            const target = relationships[i].getAttribute('Target') || '';
            slide1Path = target.startsWith('ppt/') ? target : `ppt/${target.replace(/^\//, '')}`;
            break;
          }
        }
      }
    }

    // Look for images related to slide 1
    const slide1RelsPath = slide1Path.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
    const slide1RelsXml = await zip.file(slide1RelsPath)?.async('text');
    let firstImageTarget: string | null = null;

    if (slide1RelsXml) {
      const relsDoc = domParser.parseFromString(slide1RelsXml, 'application/xml');
      const relationships = relsDoc.getElementsByTagName('Relationship');
      for (let i = 0; i < relationships.length; i++) {
        const rel = relationships[i];
        const type = rel.getAttribute('Type') || '';
        if (type.includes('image')) {
          const target = rel.getAttribute('Target') || '';
          firstImageTarget = target.includes('media/')
            ? `ppt/media/${target.split('media/').pop()}`
            : target;
          break;
        }
      }
    }

    // If first slide has an image, extract it
    if (firstImageTarget && zip.file(firstImageTarget)) {
      const mediaFile = zip.file(firstImageTarget)!;
      const isPng = firstImageTarget.toLowerCase().endsWith('.png');
      const mimeType = isPng ? 'image/png' : 'image/jpeg';
      const blob = await mediaFile.async('blob');
      const typedBlob = new Blob([blob], { type: mimeType });
      const cleanBase = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = isPng ? 'png' : 'jpg';
      const file = new File([typedBlob], `${cleanBase}-cover.${ext}`, { type: mimeType });
      const url = URL.createObjectURL(typedBlob);
      return { file, blob: typedBlob, url };
    }

    // 2. Check standard ppt/media/image1.* as second attempt
    const image1 = zip.file('ppt/media/image1.png') || zip.file('ppt/media/image1.jpeg') || zip.file('ppt/media/image1.jpg');
    if (image1) {
      const isPng = image1.name.toLowerCase().endsWith('.png');
      const mimeType = isPng ? 'image/png' : 'image/jpeg';
      const blob = await image1.async('blob');
      const typedBlob = new Blob([blob], { type: mimeType });
      const cleanBase = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = isPng ? 'png' : 'jpg';
      const file = new File([typedBlob], `${cleanBase}-cover.${ext}`, { type: mimeType });
      const url = URL.createObjectURL(typedBlob);
      return { file, blob: typedBlob, url };
    }

    // 3. Check docProps/thumbnail.jpeg or .png
    const thumbnail = zip.file('docProps/thumbnail.jpeg') || zip.file('docProps/thumbnail.png') || zip.file('docProps/thumbnail.jpg');
    if (thumbnail) {
      const isPng = thumbnail.name.toLowerCase().endsWith('.png');
      const mimeType = isPng ? 'image/png' : 'image/jpeg';
      const blob = await thumbnail.async('blob');
      const typedBlob = new Blob([blob], { type: mimeType });
      const cleanBase = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = isPng ? 'png' : 'jpg';
      const file = new File([typedBlob], `${cleanBase}-cover.${ext}`, { type: mimeType });
      const url = URL.createObjectURL(typedBlob);
      return { file, blob: typedBlob, url };
    }

    // 4. Fallback: Parse slide 1 title & text, then render a clean 16:9 canvas card
    let slideTitle = '';
    const slide1Xml = await zip.file(slide1Path)?.async('text');
    if (slide1Xml) {
      const slideDoc = domParser.parseFromString(slide1Xml, 'application/xml');
      const textNodes = slideDoc.getElementsByTagName('a:t');
      for (let i = 0; i < textNodes.length; i++) {
        const t = (textNodes[i].textContent || '').trim();
        if (t && !slideTitle) {
          slideTitle = t;
          break;
        }
      }
    }
    if (!slideTitle) {
      slideTitle = fileName.replace(/\.[^/.]+$/, '');
    }

    // Render canvas in browser environment
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Gradient background
        const grad = ctx.createLinearGradient(0, 0, 1280, 720);
        grad.addColorStop(0, '#091533');
        grad.addColorStop(0.5, '#0d1f4d');
        grad.addColorStop(1, '#050b1a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1280, 720);

        // Subtle decorative glow
        const radial = ctx.createRadialGradient(640, 360, 50, 640, 360, 500);
        radial.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
        radial.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, 1280, 720);

        // Header pill badge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(100, 120, 220, 50, 25);
        } else {
          ctx.rect(100, 120, 220, 50);
        }
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PRESENTATION', 210, 145);

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 64px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Word wrap title
        const words = slideTitle.split(' ');
        let line = '';
        let y = 240;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 1080 && n > 0) {
            ctx.fillText(line.trim(), 100, y);
            line = words[n] + ' ';
            y += 80;
            if (y > 480) break;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), 100, y);

        // Subtitle / Brand
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '600 28px system-ui, -apple-system, sans-serif';
        ctx.fillText('EdTechra Educational Presentation', 100, 580);

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
        });

        if (blob) {
          const cleanBase = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
          const file = new File([blob], `${cleanBase}-cover.jpg`, { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          return { file, blob, url };
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('[pptxParser] extractPptxCover failed:', err);
    return null;
  }
}

/**
 * Downloads a PPTX file from a URL and extracts its first slide cover.
 * Automatically caches results in memory to avoid repeated downloads.
 */
export async function extractPptxCoverFromUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (pptxCoverCache.has(url)) {
    return pptxCoverCache.get(url)!;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const extracted = await extractPptxCover(buffer, 'presentation');
    if (extracted?.url) {
      pptxCoverCache.set(url, extracted.url);
      return extracted.url;
    }
    return null;
  } catch (err) {
    console.warn('[pptxParser] Failed to extract cover from URL:', url, err);
    return null;
  }
}
