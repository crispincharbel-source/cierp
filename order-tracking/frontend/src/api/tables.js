//forntend/src/api/tables.js
import api from './axios';

export const getTables = async () => {
  const response = await api.get('/tables/list');
  return response.data;
};

export const getTableStructure = async (tableName) => {
  const response = await api.get(`/tables/${tableName}/structure`);
  return response.data;
};

export const getRecords = async (tableName, page = 1, limit = 10, sortField, sortOrder, search, filters) => {
  let url = `/tables/${tableName}/records?page=${page}&limit=${limit}`;
  
  if (sortField && sortOrder) {
    url += `&sortField=${sortField}&sortOrder=${sortOrder}`;
  }
  
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  
  if (filters) {
    url += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;
  }
  
  const response = await api.get(url);
  return response.data;
};

export const getRecord = async (tableName, id) => {
  const response = await api.get(`/tables/${tableName}/records/${id}`);
  return response.data;
};

export const createRecord = async (tableName, data) => {
  const response = await api.post(`/tables/${tableName}/records`, data);
  return response.data;
};

export const updateRecord = async (tableName, id, data) => {
  const response = await api.put(`/tables/${tableName}/records/${id}`, data);
  return response.data;
};

export const deleteRecord = async (tableName, id) => {
  const response = await api.delete(`/tables/${tableName}/records/${id}`);
  return response.data;
};

export const importCSV = async (tableName, file) => {
  const formData = new FormData();
  formData.append('csvFile', file);
  
  const response = await api.post(`/tables/${tableName}/import-csv`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const exportCSV = async (tableName, filters) => {
  // Get the authentication token from localStorage
  const token = localStorage.getItem('token');
  
  let url = `/tables/${tableName}/export-csv`;
  
  // Add token as a query parameter
  url += `?token=${token}`;
  
  // Add filters if provided
  if (filters) {
    url += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;
  }
  
  // Use window.open to trigger download
  window.open(api.defaults.baseURL + url);
  
  return { success: true };
};

export const getLookupData = async () => {
  const response = await api.get('/tables/lookup-data');
  return response.data;
};