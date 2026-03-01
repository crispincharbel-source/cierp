import api from './axios';

export const trackOrder = async (orderNumber) => {
  const response = await api.get(`/orders/track/${orderNumber}`);
  return response.data;
};


export const searchOrders = async (query) => {
  const response = await api.get(`/orders/search?query=${query}`);
  return response.data;
};