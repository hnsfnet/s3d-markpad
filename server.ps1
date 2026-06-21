$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8000/')
$listener.Start()
Write-Host "Server started at http://localhost:8000"
Write-Host "Press Ctrl+C to stop"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $url = $request.Url.LocalPath
    if ($url -eq '/') { $url = '/index.html' }
    
    $filePath = Join-Path (Get-Location) $url.TrimStart('/')
    
    if (Test-Path $filePath) {
        $content = [System.IO.File]::ReadAllBytes($filePath)
        $ext = [System.IO.Path]::GetExtension($filePath)
        switch ($ext) {
            '.html' { $response.ContentType = 'text/html; charset=utf-8' }
            '.css'  { $response.ContentType = 'text/css; charset=utf-8' }
            '.js'   { $response.ContentType = 'application/javascript; charset=utf-8' }
            '.json' { $response.ContentType = 'application/json; charset=utf-8' }
            '.svg'  { $response.ContentType = 'image/svg+xml' }
            '.png'  { $response.ContentType = 'image/png' }
            '.jpg'  { $response.ContentType = 'image/jpeg' }
            default { $response.ContentType = 'application/octet-stream' }
        }
        $response.ContentLength64 = $content.Length
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
        $response.StatusDescription = "Not Found"
        $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 - File not found")
        $response.ContentLength64 = $notFound.Length
        $response.OutputStream.Write($notFound, 0, $notFound.Length)
    }
    
    $response.Close()
}
