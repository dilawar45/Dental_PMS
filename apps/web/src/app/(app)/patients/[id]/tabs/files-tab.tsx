'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { uploadPatientFileAction, deletePatientFileAction } from '../actions';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  Eye,
  File,
  X,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';

export interface PatientFileItem {
  id: string;
  kind: 'xray' | 'photo' | 'document' | 'receipt';
  storageKey: string;
  mime: string;
  size: number;
  uploadedAt: string;
  uploaderName: string | null;
}

interface FilesTabProps {
  patientId: string;
  files: PatientFileItem[];
}

export function FilesTab({ patientId, files }: FilesTabProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileKind, setFileKind] = useState<'xray' | 'photo' | 'document' | 'receipt'>('xray');
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<PatientFileItem | null>(null);
  const [fileToDelete, setFileToDelete] = useState<PatientFileItem | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setErrorMsg('Only image files and PDF documents are allowed.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('File exceeds 25 MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setErrorMsg(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('patientId', patientId);
      fd.append('kind', fileKind);

      const res = await uploadPatientFileAction(fd);
      if (!res.success) {
        setErrorMsg(res.error);
        return;
      }

      setIsUploadOpen(false);
      setSelectedFile(null);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!fileToDelete) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await deletePatientFileAction(fileToDelete.id, patientId);
      if (!res.success) {
        setErrorMsg(res.error);
        return;
      }
      setFileToDelete(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header & Upload Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Patient Attachments & Media
          </h3>
          <p className="text-xs text-slate-500">
            Digital radiographs, intraoral clinical photography, and signed PDFs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition"
        >
          <UploadCloud className="h-4 w-4" />
          Upload Document / Asset
        </button>
      </div>

      {/* Files Grid / Empty State */}
      {files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <HardDrive className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No files uploaded yet
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload radiographs, patient identification, or signed dental consent documents.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => {
            const fileName = file.storageKey.split('/').pop() || 'file';
            const isImage = file.mime.startsWith('image/');

            return (
              <div
                key={file.id}
                className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                {/* File Thumbnail or Icon */}
                <div
                  onClick={() => setPreviewFile(file)}
                  className="cursor-pointer aspect-video w-full rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden mb-3"
                >
                  {isImage ? (
                    <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-primary transition">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-[10px]">Image Asset</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-primary transition">
                      <FileText className="h-8 w-8 text-rose-500" />
                      <span className="text-[10px] text-rose-600 font-semibold">PDF Document</span>
                    </div>
                  )}
                </div>

                {/* File Meta Info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      {file.kind}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatBytes(file.size)}
                    </span>
                  </div>

                  <p
                    title={fileName}
                    className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate"
                  >
                    {fileName}
                  </p>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>{new Date(file.uploadedAt).toLocaleDateString('en-PK', { dateStyle: 'short' })}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                        title="View details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFileToDelete(file)}
                        className="p-1 text-slate-400 hover:text-red-600 transition"
                        title="Delete asset"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Upload Patient Media / Document
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsUploadOpen(false);
                  setSelectedFile(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Kind selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Category / Kind
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['xray', 'photo', 'document', 'receipt'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setFileKind(k)}
                      className={`rounded-xl py-2 px-3 text-xs font-semibold uppercase tracking-wider border transition ${
                        fileKind === k
                          ? 'border-primary bg-primary text-primary-foreground shadow'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <UploadCloud className="mx-auto h-10 w-10 text-slate-400 mb-2" />
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatBytes(selectedFile.size)} • {selectedFile.type}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Drag and drop your file here, or click to browse
                    </p>
                    <p className="text-xs text-slate-400">
                      Supports Radiographs, Intraoral Photos, PDF Documents (Max 25 MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadOpen(false);
                    setSelectedFile(null);
                  }}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isPending}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition"
                >
                  {isPending ? 'Uploading...' : 'Confirm Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Delete Attachment
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete this file? This will hard-delete the asset from clinical storage.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 disabled:opacity-50 transition"
              >
                {isPending ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                File Details & Storage Key
              </h3>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Category</span>
                <span className="font-semibold uppercase text-slate-800 dark:text-slate-200">
                  {previewFile.kind}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">File Type (MIME)</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{previewFile.mime}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Size</span>
                <span className="text-slate-800 dark:text-slate-200">{formatBytes(previewFile.size)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Uploaded At</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {new Date(previewFile.uploadedAt).toLocaleString('en-PK')}
                </span>
              </div>
              <div className="py-1">
                <span className="text-slate-400 block mb-1">Storage Key URI</span>
                <span className="font-mono text-[11px] text-primary bg-primary/5 p-2 rounded-lg block break-all">
                  {previewFile.storageKey}
                </span>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
