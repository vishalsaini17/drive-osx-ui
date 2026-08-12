import apiClient from "./apiClient";

export const request = async ({
  method,
  url,
  data = {},
  params = {},
  headers = {},
}: {
  method: import("axios").Method;
  url: string;
  data?: any;
  params?: any;
  headers?: any;
}): Promise<any> => {
  try {
    const response = await apiClient({
      method,
      url,
      data,
      params,
      headers
    });
    return response.data;
  } catch (error: any) {
    let message = "Something went wrong";
    if (error.message) {
      message = error.response?.data?.message || "Server response with an error";
    } else if (error.request) {
      message = "The server is waking up. This may take a few seconds, please try again shoprtly";
    } else {
      message = error.message;
    }
    throw new Error(message);
  }
};
