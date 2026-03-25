import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import Swal from "sweetalert2";
import { createStudent, updateStudent, getStudent } from "../services/api";

const StudentModal = ({ show, onHide, studentId, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    age: "",
    parent_id: "",
  });
  const [validated, setValidated] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEdit = !!studentId;

  useEffect(() => {
    if (show && studentId) {
      setValidated(false);
      fetchStudent(studentId);
    } else if (show && !studentId) {
      setFormData({ name: "", email: "", age: "", parent_id: "" });
      setValidated(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, studentId]);

  const fetchStudent = async (id) => {
    try {
      const res = await getStudent(id);
      const student = res.data;
      setFormData({
        name: student.name || "",
        email: student.email || "",
        age: student.age || "",
        parent_id: student.parent_id || "",
      });
    } catch (err) {
      console.error("Error fetching student:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        age: Number(formData.age),
        parent_id: formData.parent_id ? Number(formData.parent_id) : null,
      };

      if (isEdit) {
        await updateStudent(studentId, payload);
        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "Member has been updated successfully.",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await createStudent(payload);
        Swal.fire({
          icon: "success",
          title: "Created!",
          text: "Member has been created successfully.",
          timer: 2000,
          showConfirmButton: false,
        });
      }

      onSuccess();
      onHide();
    } catch (err) {
      console.error("Error saving student:", err);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text:
          err.response?.data?.error ||
          "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{isEdit ? "Edit Member" : "Add New Member"}</Modal.Title>
      </Modal.Header>
      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="formName">
            <Form.Label>
              Member Name<span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter member name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <Form.Control.Feedback type="invalid">
              Please enter a member name.
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="formEmail">
            <Form.Label>
              Member Email<span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter member email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <Form.Control.Feedback type="invalid">
              Please enter a valid email.
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="formAge">
            <Form.Label>
              Member Age<span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="number"
              placeholder="Enter member age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              required
              min="1"
            />
            <Form.Control.Feedback type="invalid">
              Please enter a valid age.
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="formParentId">
            <Form.Label>Member Parent Id</Form.Label>
            <Form.Control
              type="number"
              placeholder="Enter parent id"
              name="parent_id"
              value={formData.parent_id}
              onChange={handleChange}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Submit"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default StudentModal;
