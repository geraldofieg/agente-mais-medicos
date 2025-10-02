from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    try:
        # Navigate to the registration page
        page.goto("http://localhost:8000/register-supervisor.html")

        # Fill in the form with unique data to avoid conflicts
        email = f"test-supervisor-{page.evaluate('() => Date.now()')}@example.com"
        password = "password123"

        page.fill("#register-email", email)
        page.fill("#register-password", password)
        page.fill("#confirm-password", password)

        # Click the register button
        page.click('button[type="submit"]')

        # The user is created, but the UNA-SUS import will fail.
        # We expect a success message for creation and a warning for the import.
        # The frontend uses the error message div for this "partial success" case.
        success_message_locator = page.locator("#error-message")

        # Wait for the message to be visible and contain the expected text
        expect(success_message_locator).to_be_visible(timeout=30000) # Increased timeout for cloud function
        expect(success_message_locator).to_contain_text("Sua conta foi criada, mas não foi possível conectar ao portal da UNA-SUS.")

        # Take a screenshot of the result
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Verification script completed successfully.")

    except Exception as e:
        print(f"An error occurred during verification: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)