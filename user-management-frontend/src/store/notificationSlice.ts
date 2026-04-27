import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ApiError {
  id: string;
  status: number;
  detail: string;
  endpoint?: string;
  timestamp: number;
}

interface NotificationState {
  errors: ApiError[];
}

const initialState: NotificationState = {
  errors: [],
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    pushApiError(state, action: PayloadAction<ApiError>) {
      state.errors.push(action.payload);
    },
    dismissApiError(state, action: PayloadAction<string>) {
      state.errors = state.errors.filter((e) => e.id !== action.payload);
    },
  },
});

export const { pushApiError, dismissApiError } = notificationSlice.actions;
export default notificationSlice.reducer;
