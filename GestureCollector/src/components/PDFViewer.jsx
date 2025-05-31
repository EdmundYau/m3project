import React, { useCallback, useState, useEffect, useRef } from "react";
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
  const [containerWidth, setContainerWidth] = useState();
  const containerRef = useRef(null);

  const onResize = useCallback((entries) => {
    const [entry] = entries;
    if (entry) {
      setContainerWidth(entry.contentRect.width);
    }
  }, []);

  const onDocumentLoadSuccess = ({ numPages: nextNumPages }) => {
    setNumPages(nextNumPages);
  };

  // Apply ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [onResize]);

  // Page-level scroll-based grayscale fade
  const [scrollGray, setScrollGray] = useState(0);
  const maxScrollGray = useRef(0);


  useEffect(() => {
    if (grayscale !== "fade") {
      setScrollGray(0);
      maxScrollGray.current = 0;

      return;
    }

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = Math.min(scrollTop / docHeight, 1);

      if (scrollProgress > maxScrollGray.current) {
        maxScrollGray.current = scrollProgress;
        setScrollGray(scrollProgress);
      }
      // else: do nothing (don't decrease grayscale)
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // initialize on load
    return () => window.removeEventListener("scroll", handleScroll);
  }, [grayscale]);

  const filterStyle =
    grayscale === "fade"
      ? {
          filter: `grayscale(${(scrollGray * 100).toFixed(0)}%)`,
          transition: "filter 0.3s ease",
        }
      : grayscale === "gray"
      ? {
          filter: "grayscale(100%)",
          transition: "none",
        }
      : {};

  return (
    <div className="PDFViewer">
      <div className="PDFViewer__container">
        <div
          className="PDFViewer__container__document"
          ref={containerRef}
          style={filterStyle}
        >
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

  .PDFViewer__container__document {
    width: 100%;
    overflow-y: auto;
        width: 2500px;
  }
      `}</style>
    </div>
  );
}
