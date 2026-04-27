import { useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { useAppSelector, useAppDispatch } from '@/hooks.redux';
import { dismissApiError } from '@/store/notificationSlice';

export function GlobalErrorNotifier() {
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useAppDispatch();
  const errors = useAppSelector((state) => state.notification.errors);

  useEffect(() => {
    if (errors.length === 0) return;

    for (const error of errors) {
      const label =
        error.status >= 500
          ? `Server error (${error.status})`
          : `Request failed (${error.status})`;

      enqueueSnackbar(`${error.detail}`, {
        variant: 'error',
        autoHideDuration: error.status >= 500 ? 8000 : 5000,
        anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
      });

      dispatch(dismissApiError(error.id));
    }
  }, [errors, enqueueSnackbar, dispatch]);

  return null;
}
