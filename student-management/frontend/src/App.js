import React from "react";
import { Container } from "react-bootstrap";
import StudentList from "./components/StudentList";
import "./App.css";

function App() {
  return (
    <Container className="py-4">
      <h2 className="mb-4">All Members</h2>
      <StudentList />
    </Container>
  );
}

export default App;
