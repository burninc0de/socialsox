// Image upload handling

export let selectedImages = [];
const MAX_IMAGES = 4;

export function setupImageUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    fileInput.setAttribute('multiple', 'true');
    
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleImageFiles(files);
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
        
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        handleImageFiles(files);
    });
    
    document.addEventListener('paste', async (e) => {
        const imageData = await window.electron.readClipboardImage();
        if (imageData) {
            const file = dataURLToFile(imageData, 'clipboard-image.png');
            handleImageFiles([file]);
        }
    });
}

function handleImageFiles(files) {
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (validFiles.length === 0) return;
    
    const remainingSlots = MAX_IMAGES - selectedImages.length;
    if (remainingSlots === 0) {
        window.showStatus(`Maximum ${MAX_IMAGES} images allowed`, 'error');
        return;
    }
    
    const filesToAdd = validFiles.slice(0, remainingSlots);
    
    for (const file of filesToAdd) {
        if (file.size > 5 * 1024 * 1024) {
            window.showStatus(`Image "${file.name}" too large! Max size is 5MB`, 'error');
            continue;
        }
        
        selectedImages.push(file);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            addImagePreview(e.target.result, selectedImages.length - 1);
        };
        reader.readAsDataURL(file);
    }
    
    updateImageUploadUI();
}

function addImagePreview(dataURL, index) {
    const container = document.getElementById('imagePreviewContainer');
    
    const previewDiv = document.createElement('div');
    previewDiv.className = 'relative border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700';
    previewDiv.dataset.imageIndex = index;
    
    const img = document.createElement('img');
    img.src = dataURL;
    img.alt = 'Preview';
    img.className = 'w-full h-32 object-cover rounded';
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'absolute top-3 right-3 w-6 h-6 rounded-full bg-red-500 text-white border-0 cursor-pointer text-sm leading-none hover:bg-red-600 transition-colors';
    removeBtn.textContent = '✕';
    removeBtn.onclick = () => removeImageAtIndex(index);
    
    previewDiv.appendChild(img);
    previewDiv.appendChild(removeBtn);
    container.appendChild(previewDiv);
}

function updateImageUploadUI() {
    const dropZone = document.getElementById('dropZone');
    const imagePreview = document.getElementById('imagePreview');
    const container = document.getElementById('imagePreviewContainer');
    const dropZoneText = dropZone.querySelector('.text-gray-600');
    
    if (selectedImages.length > 0) {
        dropZone.classList.remove('hidden');
        imagePreview.classList.remove('hidden');
        
        if (selectedImages.length >= MAX_IMAGES) {
            dropZone.classList.add('opacity-50', 'cursor-not-allowed');
            dropZoneText.textContent = `Maximum ${MAX_IMAGES} images reached`;
        } else {
            dropZone.classList.remove('opacity-50', 'cursor-not-allowed');
            dropZoneText.textContent = `Add more images (${selectedImages.length}/${MAX_IMAGES})`;
        }
    } else {
        dropZone.classList.remove('hidden', 'opacity-50', 'cursor-not-allowed');
        imagePreview.classList.add('hidden');
        dropZoneText.textContent = 'Drag & drop images here or click to select (max 4)';
        container.innerHTML = '';
    }
}

export function removeImageAtIndex(index) {
    selectedImages.splice(index, 1);
    const container = document.getElementById('imagePreviewContainer');
    container.innerHTML = '';
    
    selectedImages.forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            addImagePreview(e.target.result, i);
        };
        reader.readAsDataURL(file);
    });
    
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
