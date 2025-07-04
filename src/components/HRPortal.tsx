
import React, { useState, useRef } from 'react';
import { Upload, FileText, X, File, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  status: 'uploading' | 'success' | 'error';
}

const HRPortal = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFiles(selectedFiles);
  };

  const handleFiles = (fileList: File[]) => {
    const acceptedTypes = [
      'application/pdf',
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    const validFiles = fileList.filter(file => acceptedTypes.includes(file.type));
    
    if (validFiles.length !== fileList.length) {
      toast({
        title: "Invalid file type",
        description: "Please upload only PDF, Word, or text documents.",
        variant: "destructive",
      });
    }

    validFiles.forEach(file => {
      const newFile: UploadedFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type,
        status: 'uploading'
      };

      setFiles(prev => [...prev, newFile]);

      // Simulate upload process
      setTimeout(() => {
        setFiles(prev => 
          prev.map(f => 
            f.id === newFile.id 
              ? { ...f, status: Math.random() > 0.1 ? 'success' : 'error' as const }
              : f
          )
        );
      }, 2000 + Math.random() * 2000);
    });

    toast({
      title: "Files uploaded",
      description: `${validFiles.length} file(s) are being processed.`,
    });
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    toast({
      title: "File removed",
      description: "The file has been removed from the system.",
    });
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-6 h-6 text-red-500" />;
    if (type.includes('word')) return <File className="w-6 h-6 text-blue-500" />;
    return <FileText className="w-6 h-6 text-gray-500" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-slide-in-right">
      {/* Upload Area */}
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <Upload className="w-6 h-6 mr-3" />
          Document Upload Center
        </h2>
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
            isDragOver
              ? 'border-white bg-white/20 scale-105'
              : 'border-white/30 hover:border-white/50 hover:bg-white/5'
          }`}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className={`w-16 h-16 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-300 ${
              isDragOver ? 'scale-110' : 'hover:scale-105'
            }`}>
              <Upload className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-xl font-semibold text-white mb-2">
                {isDragOver ? 'Drop files here' : 'Upload HR Documents'}
              </p>
              <p className="text-white/70">
                Drag & drop or click to select PDF, Word, or text files
              </p>
              <p className="text-white/50 text-sm mt-2">
                Supported formats: PDF, DOC, DOCX, TXT
              </p>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl animate-fade-in">
          <h3 className="text-xl font-bold text-white mb-6">Uploaded Documents</h3>
          <div className="space-y-4">
            {files.map((file, index) => (
              <div
                key={file.id}
                className="bg-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/20 transition-all duration-300 animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center space-x-4">
                  {getFileIcon(file.type)}
                  <div>
                    <p className="font-medium text-white">{file.name}</p>
                    <p className="text-white/60 text-sm">{file.size}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusIcon(file.status)}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-2 rounded-full hover:bg-red-500/20 text-red-300 hover:text-red-200 transition-colors duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Documents', value: files.length, color: 'from-blue-400 to-purple-500' },
          { label: 'Successfully Processed', value: files.filter(f => f.status === 'success').length, color: 'from-green-400 to-blue-500' },
          { label: 'Processing', value: files.filter(f => f.status === 'uploading').length, color: 'from-yellow-400 to-orange-500' }
        ].map((stat, index) => (
          <div
            key={stat.label}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl animate-fade-in hover:scale-105 transition-transform duration-300"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center mb-4`}>
              <FileText className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-white/70">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HRPortal;
