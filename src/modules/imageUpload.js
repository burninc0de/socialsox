// Image/video upload handling

export let selectedImages = [];
const MAX_ITEMS = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 60 * 1024 * 1024;

function isImageFile(file) {
    return file.type.startsWith('image/');
}

function isVideoFile(file) {
    return file.type.startsWith('video/');
}

function getFileSizeLimit(file) {
    return isVideoFile(file) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
}

export function setupImageUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    fileInput.setAttribute('multiple', 'true');
    
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleMediaFiles(files);
    });
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary-500', 'bg-gray-100', 'dark:bg-gray-600');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-primary-500', 'bg-gray-100', 'dark:bg-gray-600');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary-500', 'bg-gray-100', 'dark:bg-gray-600');
        
        const files = Array.from(e.dataTransfer.files).filter(f => isImageFile(f) || isVideoFile(f));
        handleMediaFiles(files);
    });
    
    document.addEventListener('paste', async (e) => {
        const imageData = await window.electron.readClipboardImage();
        if (imageData) {
            const file = dataURLToFile(imageData, 'clipboard-image.png');
            handleImageFiles([file]);
        }
    });
}

function handleMediaFiles(files) {
    const validFiles = files.filter(f => isImageFile(f) || isVideoFile(f));
    
    if (validFiles.length === 0) return;
    
    const remainingSlots = MAX_ITEMS - selectedImages.length;
    if (remainingSlots === 0) {
        window.showStatus(`Maximum ${MAX_ITEMS} files allowed`, 'error');
        return;
    }
    
    const filesToAdd = validFiles.slice(0, remainingSlots);
    
    for (const file of filesToAdd) {
        const maxSize = getFileSizeLimit(file);
        if (file.size > maxSize) {
            const limitMB = maxSize === MAX_VIDEO_SIZE ? 60 : 5;
            window.showStatus(`"${file.name}" too large! Max size is ${limitMB}MB`, 'error');
            continue;
        }
        
        const currentIndex = selectedImages.length;
        selectedImages.push(file);
        
        if (isVideoFile(file)) {
            addVideoPreview(file, currentIndex);
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                addImagePreview(e.target.result, currentIndex);
            };
            reader.readAsDataURL(file);
        }
    }
    
    updateImageUploadUI();
}

function addImagePreview(dataURL, index) {
    const container = document.getElementById('imagePreviewContainer');
    
    const previewDiv = document.createElement('div');
    previewDiv.className = 'relative border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700 cursor-move';
    previewDiv.dataset.imageIndex = index;
    previewDiv.draggable = true;
    
    // Drag and drop handlers for reordering
    previewDiv.addEventListener('dragstart', handleDragStart);
    previewDiv.addEventListener('dragover', handleDragOver);
    previewDiv.addEventListener('drop', handleDrop);
    previewDiv.addEventListener('dragend', handleDragEnd);
    
    const img = document.createElement('img');
    img.src = dataURL;
    img.alt = 'Preview';
    img.className = 'w-full h-32 object-cover rounded pointer-events-none';
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'absolute top-3 right-3 w-6 h-6 rounded-full bg-red-500 text-white border-0 cursor-pointer text-sm leading-none hover:bg-red-600 transition-colors z-10';
    removeBtn.textContent = '✕';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeImageAtIndex(index);
    };
    
    previewDiv.appendChild(img);
    previewDiv.appendChild(removeBtn);
    container.appendChild(previewDiv);
}

function addVideoPreview(file, index) {
    const container = document.getElementById('imagePreviewContainer');
    
    const previewDiv = document.createElement('div');
    previewDiv.className = 'relative border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700 cursor-move';
    previewDiv.dataset.imageIndex = index;
    previewDiv.draggable = true;
    
    previewDiv.addEventListener('dragstart', handleDragStart);
    previewDiv.addEventListener('dragover', handleDragOver);
    previewDiv.addEventListener('drop', handleDrop);
    previewDiv.addEventListener('dragend', handleDragEnd);
    
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'w-full h-32 rounded pointer-events-none flex items-center justify-center bg-gray-200 dark:bg-gray-600 relative';
    
    const videoIcon = document.createElement('div');
    videoIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    videoIcon.className = 'text-gray-500 dark:text-gray-400';
    
    const duration = document.createElement('span');
    duration.className = 'absolute bottom-2 right-2 text-xs bg-black bg-opacity-70 text-white px-1 rounded';
    duration.textContent = formatFileSize(file.size);
    
    const fileName = document.createElement('span');
    fileName.className = 'absolute top-2 left-2 text-xs bg-black bg-opacity-70 text-white px-1 rounded truncate max-w-[80%]';
    fileName.textContent = file.name;
    
    videoWrapper.appendChild(videoIcon);
    videoWrapper.appendChild(duration);
    videoWrapper.appendChild(fileName);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'absolute top-3 right-3 w-6 h-6 rounded-full bg-red-500 text-white border-0 cursor-pointer text-sm leading-none hover:bg-red-600 transition-colors z-10';
    removeBtn.textContent = '✕';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeImageAtIndex(index);
    };
    
    previewDiv.appendChild(videoWrapper);
    previewDiv.appendChild(removeBtn);
    container.appendChild(previewDiv);
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

let draggedIndex = null;

function handleDragStart(e) {
    draggedIndex = parseInt(e.currentTarget.dataset.imageIndex);
    e.currentTarget.classList.add('opacity-50');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.currentTarget;
    target.classList.add('border-primary-500', 'border-4');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget;
    target.classList.remove('border-primary-500', 'border-4');
    
    const dropIndex = parseInt(target.dataset.imageIndex);
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
        // Reorder the array
        const draggedImage = selectedImages[draggedIndex];
        selectedImages.splice(draggedIndex, 1);
        selectedImages.splice(dropIndex, 0, draggedImage);
        
        // Reorder the DOM elements smoothly
        reorderImagePreviews(draggedIndex, dropIndex);
    }
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('opacity-50');
    document.querySelectorAll('[data-image-index]').forEach(el => {
        el.classList.remove('border-primary-500', 'border-4');
    });
    draggedIndex = null;
}

function reorderImagePreviews(fromIndex, toIndex) {
    const container = document.getElementById('imagePreviewContainer');
    const children = Array.from(container.children);
    
    // Move the dragged element to the new position
    const draggedElement = children[fromIndex];
    container.removeChild(draggedElement);
    
    // Insert at the drop position
    const insertIndex = toIndex;
    const referenceElement = container.children[insertIndex] || null;
    container.insertBefore(draggedElement, referenceElement);
    
    // Update all dataset.imageIndex after DOM change
    const updatedChildren = Array.from(container.children);
    updatedChildren.forEach((child, index) => {
        child.dataset.imageIndex = index;
    });
}

function refreshImagePreviews() {
    const container = document.getElementById('imagePreviewContainer');
    const scrollTop = container.scrollTop;
    
    container.innerHTML = '';
    
    selectedImages.forEach((file, i) => {
        if (isVideoFile(file)) {
            addVideoPreview(file, i);
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                addImagePreview(e.target.result, i);
            };
            reader.readAsDataURL(file);
        }
    });
    
    setTimeout(() => {
        container.scrollTop = scrollTop;
    }, 0);
}

function updateImageUploadUI() {
    const dropZone = document.getElementById('dropZone');
    const imagePreview = document.getElementById('imagePreview');
    const container = document.getElementById('imagePreviewContainer');
    const dropZoneText = dropZone.querySelector('.text-gray-600');
    
    if (selectedImages.length > 0) {
        dropZone.classList.remove('hidden');
        imagePreview.classList.remove('hidden');
        
        if (selectedImages.length >= MAX_ITEMS) {
            dropZone.classList.add('opacity-50', 'cursor-not-allowed');
            dropZoneText.textContent = `Maximum ${MAX_ITEMS} files reached`;
        } else {
            dropZone.classList.remove('opacity-50', 'cursor-not-allowed');
            dropZoneText.textContent = `Add more files (${selectedImages.length}/${MAX_ITEMS})`;
        }
    } else {
        dropZone.classList.remove('hidden', 'opacity-50', 'cursor-not-allowed');
        imagePreview.classList.add('hidden');
        dropZoneText.textContent = 'Drag & drop images or videos here or click to select (max 4)';
        container.innerHTML = '';
    }
}

export function removeImageAtIndex(index) {
    selectedImages.splice(index, 1);
    refreshImagePreviews();
    updateImageUploadUI();
    document.getElementById('fileInput').value = '';
}

export function removeImage() {
    selectedImages = [];
    const container = document.getElementById('imagePreviewContainer');
    container.innerHTML = '';
    updateImageUploadUI();
    document.getElementById('fileInput').value = '';
}

function dataURLToFile(dataURL, filename) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

export function getSelectedImages() {
    return selectedImages;
}

export function getSelectedImage() {
    return selectedImages[0] || null;
}

export function setSelectedImages(files) {
    selectedImages = files;
    refreshImagePreviews();
    updateImageUploadUI();
}
