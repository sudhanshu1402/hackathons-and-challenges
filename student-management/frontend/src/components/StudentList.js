import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Form,
  InputGroup,
  Pagination,
  Row,
  Col,
} from "react-bootstrap";
import { FaTrash } from "react-icons/fa";
import Swal from "sweetalert2";
import { getStudents, deleteStudent } from "../services/api";
import StudentModal from "./StudentModal";

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editStudentId, setEditStudentId] = useState(null);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await getStudents(page, limit, search);
      setStudents(res.data.data || []);
      const pagination = res.data.pagination || {};
      setTotalPages(pagination.totalPages || 1);
      setTotal(pagination.total || 0);
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1);
  };

  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "If You delete this Member Then this action can not be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await deleteStudent(id);
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Member has been deleted successfully.",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchStudents();
      } catch (err) {
        console.error("Error deleting student:", err);
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: "Failed to delete the member.",
        });
      }
    }
  };

  const handleAddNew = () => {
    setEditStudentId(null);
    setShowModal(true);
  };

  const handleEdit = (id) => {
    setEditStudentId(id);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditStudentId(null);
  };

  const handleModalSuccess = () => {
    fetchStudents();
  };

  const renderPagination = () => {
    const items = [];

    items.push(
      <Pagination.First
        key="first"
        onClick={() => setPage(1)}
        disabled={page === 1}
      />
    );
    items.push(
      <Pagination.Prev
        key="prev"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1}
      />
    );

    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, page + 2);

    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + 4);
      } else if (endPage === totalPages) {
        startPage = Math.max(1, endPage - 4);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === page}
          onClick={() => setPage(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    items.push(
      <Pagination.Next
        key="next"
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
      />
    );
    items.push(
      <Pagination.Last
        key="last"
        onClick={() => setPage(totalPages)}
        disabled={page === totalPages}
      />
    );

    return items;
  };

  return (
    <div>
      <Row className="mb-3 align-items-center">
        <Col md={6}>
          <InputGroup style={{ maxWidth: 300 }}>
            <Form.Control
              type="text"
              placeholder="Search..."
              value={search}
              onChange={handleSearchChange}
            />
          </InputGroup>
        </Col>
        <Col md={6} className="text-end">
          <Button variant="success" onClick={handleAddNew}>
            Add New Member
          </Button>
        </Col>
      </Row>

      <Table striped bordered hover responsive>
        <thead className="table-dark">
          <tr>
            <th>Id</th>
            <th>Member Name</th>
            <th>Member Email</th>
            <th>Age</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {students.length > 0 ? (
            students.map((student) => (
              <tr key={student.id}>
                <td>{student.id}</td>
                <td>
                  <span
                    className="text-primary"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleEdit(student.id)}
                  >
                    {student.name}
                  </span>
                </td>
                <td>{student.email}</td>
                <td>{student.age}</td>
                <td>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(student.id, student.name)}
                  >
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center">
                No members found.
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      <Row className="align-items-center">
        <Col md={6}>
          <div className="d-flex align-items-center">
            <span className="me-2">Show</span>
            <Form.Select
              style={{ width: "auto" }}
              value={limit}
              onChange={handleLimitChange}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </Form.Select>
            <span className="ms-2">entries</span>
            <span className="ms-3 text-muted">
              (Total: {total} members)
            </span>
          </div>
        </Col>
        <Col md={6}>
          <Pagination className="justify-content-end mb-0">
            {renderPagination()}
          </Pagination>
        </Col>
      </Row>

      <StudentModal
        show={showModal}
        onHide={handleModalClose}
        studentId={editStudentId}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default StudentList;
