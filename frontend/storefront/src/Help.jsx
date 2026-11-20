import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../shared/UI';
export default function Help() {
  return (
    <div className="store-container inner-page help-page">
      <PageHeader title="A few good things to know" description="Clear answers for a considered purchase." />
      <div className="stack">
        <section className="panel">
          <h2>Shipping & delivery</h2>
          <p>
            Standard shipping is $9.95, or free for orders of $100 or more. All amounts are in USD. This
            demonstration has no additional tax.
          </p>
          <p>
            Delivery and carrier tracking are simulated. Your account shows each order’s current stage, demo
            tracking number, and estimated delivery date once the team creates a shipment.
          </p>
          <Link className="text-button" to="/account/orders">
            Track your orders
          </Link>
        </section>
        <section className="panel">
          <h2>Cancellations & returns</h2>
          <p>
            You can cancel a pending or confirmed order in your account. Reserved inventory is restored and
            any successful card payment is refunded in the simulation.
          </p>
          <p>
            Once an order is processing, contact the store team for cancellation. Dispatched and delivered
            orders cannot be cancelled. This demonstration does not include a physical returns or warranty
            service.
          </p>
        </section>
        <section id="payments" className="panel">
          <h2>Payments, without the sensitive details</h2>
          <p>
            Choose simulated card payment or cash on delivery. No real card number, CVV, or payment credential
            is collected. The checkout offers both approved and declined outcomes so you can explore the
            complete experience.
          </p>
          <p>
            A declined order can be retried from its order page. Cash-on-delivery orders become paid only when
            delivery is marked complete.
          </p>
        </section>
        <section id="about" className="panel">
          <h2>About NOVARA</h2>
          <p>
            NOVARA is a fictional electronics retailer built around a simple idea: the right technology makes
            the everyday better. Explore a considered collection of work and listening essentials, with one
            connected system from discovery to delivery.
          </p>
          <p>
            Products, prices, people, and past orders are sample data. Product imagery is illustrative. No
            physical items will be shipped.
          </p>
        </section>
      </div>
    </div>
  );
}
