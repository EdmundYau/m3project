import React from "react";
import GestureCollector from "../GestureCollector";

const RFPage = () => {
  return (
    <div>
      <h2>Random Forest Classifier</h2>
      <GestureCollector model="rf" />
    </div>
  );
};

export default RFPage;
