import { useEffect, useState } from "react";

import axios from "axios";
import { useBoolean } from "@/hooks/use-boolean";

export function useGetData() {
  const [dataDB, setDataDB] = useState({
    data: null,
    error: null,
    empty: true,
    totalData: 0,
  });

  const [loading, setLoading] = useState(true);

  const getData = async (route, body) => {
    try {
      setLoading(true);
      const { data } = await axios.get(route, body);

      setDataDB({
        data: data.items,
        error: null,
        empty: data.items.length,
        totalData: data.totalItems,
      });

      return data;
    } catch (error) {
      setDataDB({
        data: null,
        totalData: null,
        error: error,
        empty: true,
      });

      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    ...dataDB,
    loading,
    getData,
  };
}

export function useGetOneData() {
  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(true);

  const getData = async (route, body) => {
    try {
      setLoading(true);
      const { data } = await axios.get(route, body);

      setData(data);

      return data;
    } catch (error) {
      setData(null);

      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    getData,
  };
}

export function useCreateData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createData = async (route, body) => {
    try {
      setLoading(true);

      const response = await axios.post(route, body);

      return response;
    } catch (error) {
      console.log(error);

      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createData,
    error,
    loading,
  };
}

export function useUpdateData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateData = async (route, body) => {
    try {
      setLoading(true);
      const response = await axios.put(route, body);

      return response;
    } catch (error) {
      setError(error);

      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateData,
    loading,
    error,
  };
}

export function useDeleteData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteData = async (route, body) => {
    try {
      setLoading(true);
      const response = await axios.delete(route, body);

      return response;
    } catch (error) {
      setError(error);

      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteData,
    loading,
    error,
  };
}

// try

export function useGetDataDb(api, options, dontRunFirst = false) {
  // state
  const [data, setData] = useState(null);
  const [option, setOptiob] = useState({});
  const [error, setError] = useState(null);

  const loading = useBoolean();

  const refetch = async (options) => {
    loading.onTrue();

    try {
      const { data } = await axios.get(api, {
        headers: {
          ...options,
        },
      });

      const { items, ...other } = data;

      setData(items || data);
      setOptiob(other);
      setError(null);
      loading.onFalse();
    } catch (error) {
      loading.onFalse();
      setError(error);

      throw error;
    } finally {
      loading.onFalse();
    }
  };

  useEffect(() => {
    if (api && !dontRunFirst) {
      refetch(options);
    }
  }, [api, dontRunFirst]);

  return {
    data,
    option,
    error,
    loading: loading.value,
    refetch,
  };
}
