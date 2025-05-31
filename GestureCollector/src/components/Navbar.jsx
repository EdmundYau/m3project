import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav style={styles.navbar}>
      <div style={styles.logo}>Gesture Classifier</div>
      <ul style={styles.navLinks}>
        <li>
          <Link to="/" style={styles.link}>
            Collect Gestures
          </Link>
        </li>
        <li>
          <Link to="/knn" style={styles.link}>
            KNN Classifier
          </Link>
        </li>
        <li>
          <Link to="/rf" style={styles.link}>
            Random Forest Classifier
          </Link>
        </li>
        <li>
          <Link to="/svm" style={styles.link}>
            SVM Classifier
          </Link>
        </li>
      </ul>
    </nav>
  );
};

const styles = {
  navbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#333",
    color: "#fff",
    padding: "10px 20px",
  },
  logo: {
    fontSize: "1.2rem",
    fontWeight: "bold",
  },
  navLinks: {
    listStyle: "none",
    display: "flex",
    gap: "20px",
    margin: 0,
    padding: 0,
  },
  link: {
    color: "#fff",
    textDecoration: "none",
    padding: "5px 10px",
    borderRadius: "4px",
    transition: "background-color 0.3s",
  },
};

export default Navbar;
