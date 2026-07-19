import { useEffect } from 'react';
import { axiosPrivate } from '../services/api';
import { useAuth } from './useAuth';

export const useAxiosPrivate = () => {
  const { accessToken, refreshAccessToken, logout } = useAuth();

  useEffect(() => {
    const requestIntercept = axiosPrivate.interceptors.request.use(
      (config) => {
        if (!config.headers['Authorization'] && accessToken) {
          config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseIntercept = axiosPrivate.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error?.config;
        if (error?.response?.status === 401 && !prevRequest?.sent) {
          prevRequest.sent = true;
          try {
            const newAccessToken = await refreshAccessToken();
            prevRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return axiosPrivate(prevRequest);
          } catch (refreshError) {
            // If refresh fails, log the user out
            logout();
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosPrivate.interceptors.request.eject(requestIntercept);
      axiosPrivate.interceptors.response.eject(responseIntercept);
    };
  }, [accessToken, refreshAccessToken, logout]);

  return axiosPrivate;
};
export default useAxiosPrivate;
