import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import GestureCollector from "./GestureCollector";
import Navbar from "./components/Navbar";



const App = () => {
  return (
    <Router>
      <Navbar />

      <Routes>
        <Route path="/" element={<GestureCollector />} />
        <Route path="/knn" element={<GestureCollector model="knn" />} />
        <Route path="/rf" element={<GestureCollector model="rf" />} />
        <Route path="/svm" element={<GestureCollector model="svm" />} />
        
      </Routes>
    </Router>
  );
};

export default App;
