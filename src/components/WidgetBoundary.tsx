"use client";
// Un widget qui plante n'emporte pas le reste du tableau de bord.

import { Component, type ReactNode } from "react";

export default class WidgetBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <p className="muted small">Ce panneau n&apos;a pas pu se charger.</p>;
    return this.props.children;
  }
}
