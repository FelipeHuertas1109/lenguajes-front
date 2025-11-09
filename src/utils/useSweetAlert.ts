import Swal from 'sweetalert2';

export const useSweetAlert = () => {
  const showError = (title: string, message?: string) => {
    return Swal.fire({
      icon: 'error',
      title,
      text: message,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Aceptar',
    });
  };

  const showSuccess = (title: string, message?: string) => {
    return Swal.fire({
      icon: 'success',
      title,
      text: message,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Aceptar',
      timer: 3000,
      timerProgressBar: true,
    });
  };

  const showWarning = (title: string, message?: string) => {
    return Swal.fire({
      icon: 'warning',
      title,
      text: message,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'Aceptar',
    });
  };

  const showInfo = (title: string, message?: string) => {
    return Swal.fire({
      icon: 'info',
      title,
      text: message,
      confirmButtonColor: '#3b82f6',
      confirmButtonText: 'Aceptar',
    });
  };

  const showConfirm = (
    title: string,
    message?: string,
    confirmText = 'Sí',
    cancelText = 'No'
  ) => {
    return Swal.fire({
      title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#6b7280',
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
    });
  };

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo,
    showConfirm,
  };
};

