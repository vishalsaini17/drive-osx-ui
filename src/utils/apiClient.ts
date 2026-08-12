import axios from 'axios';

// export const baseApiUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
export const baseApiUrl = `${(import.meta as any).env.VITE_API_BASE_URL}/api/v1`
console.log("api client base url --->", baseApiUrl)


const apiClient = axios.create({
    baseURL: baseApiUrl,
    headers: {
        'Content-Type': 'application/json'
    },
    transformRequest: [(data) => {
        if (data instanceof FormData) {
            return data;
        }
        return JSON.stringify(data);
    }],
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // ✅ IMPORTANT: Remove Content-Type for FormData
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const refreshToken = localStorage.getItem("refreshToken");

        // If 401 and we have a refresh token, try to refresh
        if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
            originalRequest._retry = true;

            try {
                const data = await axios.post(`${baseApiUrl}/auth/refresh`, { refresh: refreshToken });

                localStorage.setItem("accessToken", data.data.access);
                if (data.data.refresh) {
                    localStorage.setItem("refreshToken", data.data.refresh);
                }

                apiClient.defaults.headers.common["Authorization"] = `Bearer ${data.data.access}`;
                originalRequest.headers.Authorization = `Bearer ${data.data.access}`;

                return apiClient(originalRequest);
            } catch (refreshError) {
                // Clear tokens and redirect to login
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;