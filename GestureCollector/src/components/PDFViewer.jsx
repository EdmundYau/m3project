import React, { useCallback, useState, useEffect } from "react";
import { pdfjs, Document, Page } from "react-pdf";

import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure the worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const options = {
  cMapUrl: "/cmaps/",
  standardFontDataUrl: "/standard_fonts/",
};

const maxWidth = 800;

export default function PDFViewer({
  file = "/sample.pdf",
  grayscale = "none",
}) {
  const [numPages, setNumPages] = useState();
  const [containerRef, setContainerRef] = useState(null);
  const [containerWidth, setContainerWidth] = useState();

  const onResize = useCallback((entries) => {
    const [entry] = entries;
    if (entry) {
      setContainerWidth(entry.contentRect.width);
    }
  }, []);

  function onDocumentLoadSuccess({ numPages: nextNumPages }) {
    setNumPages(nextNumPages);
  }

  // Optional: apply ResizeObserver (if you want dynamic resizing)
  // useEffect(() => {
  //   if (!containerRef) return;
  //   const resizeObserver = new ResizeObserver(onResize);
  //   resizeObserver.observe(containerRef);
  //   return () => resizeObserver.disconnect();
  // }, [containerRef, onResize]);

  return (
    <div
      className={`PDFViewer ${
        grayscale === "fade"
          ? "fade-grayscale"
          : grayscale === "gray"
          ? "instant-grayscale"
          : ""
      }`}
    >
      <div className="PDFViewer__container">
        <div className="PDFViewer__container__document" ref={setContainerRef}>
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            options={options}
          >
            {Array.from(new Array(numPages), (el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={
                  containerWidth ? Math.min(containerWidth, maxWidth) : maxWidth
                }
              />
            ))}
          </Document>
        </div>
      </div>
      <style>{`
        .fade-grayscale {
          filter: grayscale(100%);
          transition: filter 3s ease-in-out;
        }
        .instant-grayscale {
          filter: grayscale(100%);
          transition: none;
        }
      `}</style>
    </div>
  );
}
