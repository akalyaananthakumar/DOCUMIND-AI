// ============================================================
// DOCUMIND AI - FRONTEND JAVASCRIPT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    // ========================================================
    // ELEMENTS
    // ========================================================

    const fileInput = document.getElementById("fileInput");
    const chooseFileBtn = document.getElementById("chooseFileBtn");
    const selectedFile = document.getElementById("selectedFile");
    const uploadBtn = document.getElementById("uploadBtn");
    const uploadStatus = document.getElementById("uploadStatus");

    const refreshBtn = document.getElementById("refreshBtn");
    const clearBtn = document.getElementById("clearBtn");
    const documentList = document.getElementById("documentList");

    const chatArea = document.getElementById("chatArea");
    const chatForm = document.getElementById("chatForm");
    const questionInput = document.getElementById("questionInput");
    const sendBtn = document.getElementById("sendBtn");


    // ========================================================
    // STATE
    // ========================================================

    let selectedFileObject = null;
    let isUploading = false;
    let isSending = false;


    // ========================================================
    // FILE SELECTION
    // ========================================================

    if (chooseFileBtn && fileInput) {

        chooseFileBtn.addEventListener("click", () => {
            fileInput.click();
        });
    }


    if (fileInput) {

        fileInput.addEventListener("change", () => {

            const file = fileInput.files[0];

            if (!file) {

                selectedFileObject = null;

                if (selectedFile) {
                    selectedFile.textContent = "No file selected";
                }

                if (uploadBtn) {
                    uploadBtn.disabled = true;
                }

                return;
            }


            // ------------------------------------------------
            // Validate extension
            // ------------------------------------------------

            const extension = file.name
                .split(".")
                .pop()
                .toLowerCase();

            if (!["pdf", "txt"].includes(extension)) {

                showUploadStatus(
                    "Please select a PDF or TXT file.",
                    "error"
                );

                fileInput.value = "";

                selectedFileObject = null;

                if (uploadBtn) {
                    uploadBtn.disabled = true;
                }

                return;
            }


            // ------------------------------------------------
            // Validate file size
            // ------------------------------------------------

            const maxSize = 20 * 1024 * 1024;

            if (file.size > maxSize) {

                showUploadStatus(
                    "File size must be 20 MB or smaller.",
                    "error"
                );

                fileInput.value = "";

                selectedFileObject = null;

                if (uploadBtn) {
                    uploadBtn.disabled = true;
                }

                return;
            }


            selectedFileObject = file;


            // ------------------------------------------------
            // Display selected file
            // ------------------------------------------------

            if (selectedFile) {

                selectedFile.textContent =
                    `${file.name} • ${formatFileSize(file.size)}`;

                selectedFile.classList.add("has-file");
            }


            if (uploadBtn) {
                uploadBtn.disabled = false;
            }

            showUploadStatus("", "");
        });
    }


    // ========================================================
    // UPLOAD DOCUMENT
    // ========================================================

    if (uploadBtn) {

        uploadBtn.addEventListener("click", async () => {

            if (!selectedFileObject || isUploading) {
                return;
            }

            isUploading = true;

            uploadBtn.disabled = true;

            const originalText = uploadBtn.textContent;

            uploadBtn.textContent = "Indexing...";

            showUploadStatus(
                "Extracting text and creating embeddings...",
                "loading"
            );


            try {

                const formData = new FormData();

                formData.append(
                    "file",
                    selectedFileObject
                );


                const response = await fetch(
                    "/api/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );


                const data = await parseResponse(response);


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        data.message ||
                        "Document upload failed."
                    );
                }


                showUploadStatus(
                    data.message ||
                    "Document indexed successfully.",
                    "success"
                );


                // Refresh document list
                await loadDocuments();


                // Reset file selection
                selectedFileObject = null;

                fileInput.value = "";

                if (selectedFile) {

                    selectedFile.textContent =
                        "No file selected";

                    selectedFile.classList.remove(
                        "has-file"
                    );
                }


            } catch (error) {

                console.error(
                    "Upload error:",
                    error
                );

                showUploadStatus(
                    error.message ||
                    "Could not upload the document.",
                    "error"
                );

            } finally {

                isUploading = false;

                uploadBtn.disabled =
                    !selectedFileObject;

                uploadBtn.textContent =
                    originalText;
            }
        });
    }


    // ========================================================
    // LOAD DOCUMENTS
    // ========================================================

    async function loadDocuments() {

        if (!documentList) {
            return;
        }


        documentList.innerHTML = `
            <div class="document-loading">
                Loading documents...
            </div>
        `;


        try {

            const response = await fetch(
                "/api/documents"
            );

            const data = await parseResponse(response);


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    data.message ||
                    "Could not load documents."
                );
            }


            const documents =
                data.documents || [];


            renderDocuments(documents);


        } catch (error) {

            console.error(
                "Document loading error:",
                error
            );

            documentList.innerHTML = `
                <div class="empty-state error-state">
                    Could not load documents.
                </div>
            `;
        }
    }


    // ========================================================
    // RENDER DOCUMENT LIST
    // ========================================================

    function renderDocuments(documents) {

        if (!documentList) {
            return;
        }


        if (!documents.length) {

            documentList.innerHTML = `
                <div class="empty-state">
                    No documents indexed yet.
                </div>
            `;

            return;
        }


        documentList.innerHTML = "";


        documents.forEach((documentName) => {

            const item =
                document.createElement("div");

            item.className =
                "document-item";


            item.innerHTML = `
                <div class="document-icon">
                    ${getFileIcon(documentName)}
                </div>

                <div class="document-info">
                    <div class="document-name"
                         title="${escapeAttribute(documentName)}">
                        ${escapeHTML(documentName)}
                    </div>

                    <div class="document-status">
                        Indexed
                    </div>
                </div>
            `;


            documentList.appendChild(item);
        });
    }


    // ========================================================
    // REFRESH DOCUMENTS
    // ========================================================

    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            async () => {

                refreshBtn.classList.add(
                    "rotating"
                );

                await loadDocuments();

                setTimeout(() => {

                    refreshBtn.classList.remove(
                        "rotating"
                    );

                }, 500);
            }
        );
    }


    // ========================================================
    // CLEAR DATABASE
    // ========================================================

    if (clearBtn) {

        clearBtn.addEventListener(
            "click",
            async () => {

                const confirmed =
                    window.confirm(
                        "Are you sure you want to delete all indexed documents and their vectors?"
                    );


                if (!confirmed) {
                    return;
                }


                clearBtn.disabled = true;

                const originalText =
                    clearBtn.textContent;

                clearBtn.textContent =
                    "Clearing...";


                try {

                    const response = await fetch(
                        "/api/clear",
                        {
                            method: "POST"
                        }
                    );


                    const data =
                        await parseResponse(response);


                    if (!response.ok) {

                        throw new Error(
                            data.error ||
                            data.message ||
                            "Could not clear documents."
                        );
                    }


                    await loadDocuments();


                    // Reset chat
                    resetChat();


                    showUploadStatus(
                        "All documents were cleared.",
                        "success"
                    );


                } catch (error) {

                    console.error(
                        "Clear error:",
                        error
                    );

                    showUploadStatus(
                        error.message ||
                        "Could not clear documents.",
                        "error"
                    );

                } finally {

                    clearBtn.disabled = false;

                    clearBtn.textContent =
                        originalText;
                }
            }
        );
    }


    // ========================================================
    // CHAT
    // ========================================================

    if (chatForm) {

        chatForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                if (isSending) {
                    return;
                }


                const question =
                    questionInput.value.trim();


                if (!question) {
                    questionInput.focus();
                    return;
                }


                await sendQuestion(question);
            }
        );
    }


    // ========================================================
    // SEND QUESTION
    // ========================================================

    async function sendQuestion(question) {

        isSending = true;

        setChatLoading(true);


        // Add user message
        addUserMessage(question);


        // Clear input
        questionInput.value = "";


        // Add temporary assistant message
        const loadingMessage =
            addLoadingMessage();


        try {

            const response = await fetch(
                "/api/chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        question: question
                    })
                }
            );


            const data =
                await parseResponse(response);


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    data.message ||
                    "Could not generate an answer."
                );
            }


            // Remove loading message
            loadingMessage.remove();


            const answer =
                data.answer ||
                "No answer was returned.";


            const sources =
                data.sources || [];


            addAssistantMessage(
                answer,
                sources
            );


        } catch (error) {

            console.error(
                "Chat error:",
                error
            );


            loadingMessage.remove();


            addAssistantMessage(
                error.message ||
                "Something went wrong while generating the answer.",
                []
            );

        } finally {

            isSending = false;

            setChatLoading(false);

            questionInput.focus();
        }
    }


    // ========================================================
    // ADD USER MESSAGE
    // ========================================================

    function addUserMessage(question) {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "message-row user-row";


        wrapper.innerHTML = `
            <div class="message user-message">
                ${escapeHTML(question)}
            </div>

            <div class="user-avatar">
                U
            </div>
        `;


        chatArea.appendChild(wrapper);

        scrollToBottom();
    }


    // ========================================================
    // ADD LOADING MESSAGE
    // ========================================================

    function addLoadingMessage() {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "message-row assistant-row";


        wrapper.innerHTML = `
            <div class="assistant-avatar">
                D
            </div>

            <div class="message assistant-message loading-message">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;


        chatArea.appendChild(wrapper);

        scrollToBottom();


        return wrapper;
    }


    // ========================================================
    // ADD ASSISTANT MESSAGE
    // ========================================================

    function addAssistantMessage(
        answer,
        sources
    ) {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "assistant-result";


        const sourcesHTML =
            buildSourcesHTML(sources);


        wrapper.innerHTML = `
            <div class="message-row assistant-row">

                <div class="assistant-avatar">
                    D
                </div>

                <div class="message assistant-message">
                    ${formatAnswer(answer)}
                </div>

            </div>

            ${sourcesHTML}
        `;


        chatArea.appendChild(wrapper);


        // Attach source toggle
        const toggle =
            wrapper.querySelector(
                ".sources-toggle"
            );


        const sourceContent =
            wrapper.querySelector(
                ".sources-content"
            );


        if (toggle && sourceContent) {

            toggle.addEventListener(
                "click",
                () => {

                    const isOpen =
                        sourceContent.classList
                            .contains("open");


                    sourceContent.classList.toggle(
                        "open"
                    );


                    toggle.classList.toggle(
                        "open"
                    );


                    toggle.setAttribute(
                        "aria-expanded",
                        String(!isOpen)
                    );
                }
            );
        }


        scrollToBottom();
    }


    // ========================================================
    // BUILD SOURCES
    // ========================================================

    function buildSourcesHTML(sources) {

        if (!sources || !sources.length) {
            return "";
        }


        const sourceCount =
            sources.length;


        const sourceCards =
            sources.map(
                (source, index) => {

                    const sourceName =
                        source.source ||
                        "Unknown document";


                    const page =
                        source.page ||
                        1;


                    const chunk =
                        source.chunk ||
                        1;


                    const relevance =
                        source.relevance;


                    const preview =
                        source.preview ||
                        "No preview available.";


                    let relevanceHTML = "";


                    if (
                        relevance !== undefined &&
                        relevance !== null
                    ) {

                        const percentage =
                            Math.max(
                                0,
                                Math.min(
                                    100,
                                    Math.round(
                                        Number(
                                            relevance
                                        ) * 100
                                    )
                                )
                            );


                        relevanceHTML = `
                            <span class="source-relevance">
                                ${percentage}% match
                            </span>
                        `;
                    }


                    return `
                        <div class="source-card">

                            <div class="source-top">

                                <div class="source-document">
                                    <span class="file-icon">
                                        ${getFileIcon(sourceName)}
                                    </span>

                                    <span
                                        title="${escapeAttribute(sourceName)}"
                                    >
                                        ${escapeHTML(sourceName)}
                                    </span>
                                </div>

                                ${relevanceHTML}

                            </div>


                            <div class="source-meta">

                                <span class="source-badge">
                                    Page ${escapeHTML(String(page))}
                                </span>

                                <span class="source-badge">
                                    Chunk ${escapeHTML(String(chunk))}
                                </span>

                                <span class="source-number">
                                    Source ${index + 1}
                                </span>

                            </div>


                            <div class="source-preview">
                                ${escapeHTML(preview)}
                            </div>

                        </div>
                    `;
                }
            ).join("");


        return `
            <section class="sources-section">

                <button
                    type="button"
                    class="sources-toggle"
                    aria-expanded="false"
                >

                    <span class="sources-title">

                        <span class="sources-icon">
                            ◉
                        </span>

                        <span>
                            Retrieved sources
                        </span>

                        <span class="sources-count">
                            ${sourceCount}
                        </span>

                    </span>

                    <span class="sources-arrow">
                        ▾
                    </span>

                </button>


                <div class="sources-content">

                    <div class="sources-list">
                        ${sourceCards}
                    </div>

                </div>

            </section>
        `;
    }


    // ========================================================
    // FORMAT ANSWER
    // ========================================================

    function formatAnswer(answer) {

        if (!answer) {
            return "";
        }


        let formatted =
            escapeHTML(answer);


        // Convert simple numbered lists
        formatted =
            formatted.replace(
                /(^|\n)(\d+)\.\s/g,
                "$1<br><strong>$2.</strong> "
            );


        // Convert bullet points
        formatted =
            formatted.replace(
                /(^|\n)[•*-]\s/g,
                "$1<br>• "
            );


        // Convert line breaks
        formatted =
            formatted.replace(
                /\n/g,
                "<br>"
            );


        return formatted;
    }


    // ========================================================
    // RESET CHAT
    // ========================================================

    function resetChat() {

        if (!chatArea) {
            return;
        }


        chatArea.innerHTML = `
            <div class="welcome-card">

                <div class="welcome-icon">
                    ✦
                </div>

                <h3>
                    Welcome to DocuMind AI
                </h3>

                <p>
                    Upload a PDF or TXT document,
                    then ask questions about its content.
                </p>

                <div class="workflow">
                    <span>Upload</span>
                    <b>→</b>
                    <span>Embed</span>
                    <b>→</b>
                    <span>Retrieve</span>
                    <b>→</b>
                    <span>Answer</span>
                </div>

            </div>
        `;
    }


    // ========================================================
    // CHAT LOADING STATE
    // ========================================================

    function setChatLoading(loading) {

        if (!sendBtn) {
            return;
        }


        sendBtn.disabled = loading;

        sendBtn.textContent =
            loading ? "Thinking..." : "Send";
    }


    // ========================================================
    // UPLOAD STATUS
    // ========================================================

    function showUploadStatus(
        message,
        type
    ) {

        if (!uploadStatus) {
            return;
        }


        uploadStatus.textContent =
            message;


        uploadStatus.className =
            "status";


        if (type) {

            uploadStatus.classList.add(
                `status-${type}`
            );
        }
    }


    // ========================================================
    // SCROLL
    // ========================================================

    function scrollToBottom() {

        if (!chatArea) {
            return;
        }


        setTimeout(() => {

            chatArea.scrollTo({
                top: chatArea.scrollHeight,
                behavior: "smooth"
            });

        }, 50);
    }


    // ========================================================
    // RESPONSE PARSER
    // ========================================================

    async function parseResponse(response) {

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            return await response.json();
        }


        const text =
            await response.text();


        return {
            message: text,
            error: text
        };
    }


    // ========================================================
    // FILE SIZE
    // ========================================================

    function formatFileSize(bytes) {

        if (bytes < 1024) {
            return `${bytes} B`;
        }


        if (bytes < 1024 * 1024) {

            return `${(
                bytes / 1024
            ).toFixed(1)} KB`;
        }


        return `${(
            bytes / (1024 * 1024)
        ).toFixed(1)} MB`;
    }


    // ========================================================
    // FILE ICON
    // ========================================================

    function getFileIcon(filename) {

        const extension =
            filename
                .split(".")
                .pop()
                .toLowerCase();


        if (extension === "pdf") {
            return "PDF";
        }


        if (extension === "txt") {
            return "TXT";
        }


        return "DOC";
    }


    // ========================================================
    // SECURITY HELPERS
    // ========================================================

    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function escapeAttribute(value) {

        return escapeHTML(value);
    }


    // ========================================================
    // INITIAL LOAD
    // ========================================================

    loadDocuments();

});