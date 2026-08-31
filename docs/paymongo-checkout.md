# PayMongo hosted checkout

ML-DEP uses PayMongo Hosted Checkout v2 for GCash, Maya, and QR Ph. PayMongo
hosts the payment-method interface; wallet credentials and card data never pass
through ML-DEP.

## Trust boundary

Staff first records the exact PHP amount on the order. Creating a checkout does
not mark the order paid. ML-DEP changes the settlement to `CAPTURED` only after:

1. the callback's `Paymongo-Signature` HMAC matches the endpoint signing secret;
2. the callback timestamp is no more than five minutes old;
3. ML-DEP retrieves the referenced Checkout Session with the server API key;
4. the session is paid and its order UUID, amount, currency, and session ID all
   match the prepared settlement.

Duplicate callbacks are idempotent through the existing payment state machine.
Publication remains blocked until the settlement is `CAPTURED` or an authorized
staff member records a waiver.

An active hosted checkout blocks cash settlement and waiver controls. Staff can
use **Cancel checkout**; ML-DEP first expires the session at PayMongo and only
then clears the local reference. This prevents a customer paying an old link
after staff accepted another settlement method.

## Test setup

1. Complete PayMongo account verification and enable the required payment
   methods.
2. In PayMongo **Developers > API Keys**, copy the `sk_test_...` secret key.
3. Deploy the webhook route before registering the callback.
4. In **Developers > Webhooks**, create a test endpoint for only
   `checkout_session.payment.paid`:

   `https://mlprinting.vercel.app/api/payments/paymongo/webhook`

5. Save its `whsk_...` signing secret.
6. Add both values to Vercel Preview first, without exposing them to the browser:

   - `PAYMONGO_SECRET_KEY`
   - `PAYMONGO_WEBHOOK_SECRET`

7. Redeploy, prepare an online amount from **Admin > Bookings**, and complete one
   test checkout for each enabled method. Verify the PayMongo payment, ML-DEP
   order audit event, customer order status, and publication gate.

## Live cutover

Use a separate live webhook endpoint/signing secret and the `sk_live_...` key.
Do not reuse test secrets. Run the complete test-mode flow before adding live
credentials to Vercel Production. Rotate either secret immediately if it is
ever copied into source, logs, chat, or a client-visible environment variable.

Cash/bank transfer verification remains available as a separate staff-only
fallback.
