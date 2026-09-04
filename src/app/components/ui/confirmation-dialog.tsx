import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  requirePhrase?: boolean;
  confirmationPhrase?: string;
  loading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  requirePhrase = false,
  confirmationPhrase = "Docufy",
  loading = false,
}: ConfirmationDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setInputValue('');
      setError('');
    }
  }, [open]);

  const canConfirm = requirePhrase ? inputValue.trim() === confirmationPhrase : true;

  const handleConfirm = () => {
    if (loading) return;
    if (requirePhrase && inputValue.trim() !== confirmationPhrase) {
      setError(`Please type "${confirmationPhrase}" exactly to confirm.`);
      return;
    }
    onConfirm();
    onOpenChange(false);
    setInputValue('');
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {/* Wrapping in a form lets the shared dialog Enter handler (which finds a
            submit button) trigger the confirm action consistently with mouse clicks.
            The cancel button is type="button" so it never becomes the primary. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirm();
          }}
          className="contents"
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              {destructive && (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
              )}
              <DialogTitle className="text-xl">{title}</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              {description}
            </DialogDescription>
          </DialogHeader>

          {requirePhrase && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="confirmation-input" className="text-sm font-medium">
                  Type <span className="font-bold text-red-400">"{confirmationPhrase}"</span> to confirm
                </Label>
                <Input
                  id="confirmation-input"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setError('');
                  }}
                  placeholder={confirmationPhrase}
                  className={error ? 'border-blue-500 focus-visible:ring-red-500' : ''}
                  autoComplete="off"
                />
                {error && (
                  <p className="text-sm text-red-400 font-medium">{error}</p>
                )}
              </div>

              <div className="bg-white border-2 border-blue-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> This action requires confirmation for maximum protection.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              disabled={!canConfirm || loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
