// Image upload handling

export let selectedImage = null;

export function setupImageUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
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
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    });
    
    document.addEventListener('paste', async (e) => {
        const imageData = await window.electron.readClipboardImage();
        if (imageData) {
            const file = dataURLToFile(imageData, 'clipboard-image.png');
            handleImageFile(file);
        }
    });
}

function handleImageFile(file) {
    if (file.size > 5 * 1024 * 1024) {
        window.showStatus('Image too large! Max size is 5MB', 'error');
        return;
    }
    
    selectedImage = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('dropZone').classList.add('hidden');
        document.getElementById('imagePreview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

export function removeImage() {
    selectedImage = null;
    document.getElementById('dropZone').classList.remove('hidden');
    document.getElementById('imagePreview').classList.add('hidden');
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

export function getSelectedImage() {
    return selectedImage;
}
