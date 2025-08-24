"use strict";
// src/config/newsSources.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsSources = exports.rssFeeds = void 0;
// RSS feeds (most reliable source)
exports.rssFeeds = [
    {
        url: "https://variety.com/c/film/feed/",
        name: "Variety Films",
    },
    {
        url: "https://ew.com/movies/feed/",
        name: "Entertainment Weekly Movies",
    },
    {
        url: "https://www.thewrap.com/category/movies/feed/",
        name: "TheWrap Movies",
    },
    {
        url: "https://www.hollywoodreporter.com/c/movies/feed/",
        name: "Hollywood Reporter Movies",
    },
    {
        url: "https://deadline.com/c/movies/feed/",
        name: "Deadline Movies",
    },
    {
        url: "https://www.indiewire.com/c/film/feed/",
        name: "IndieWire Film",
    },
];
// Updated web scraping sources with current selectors
exports.newsSources = [
    {
        name: "Variety",
        url: "https://variety.com/c/film/",
        baseUrl: "https://variety.com",
        selector: {
            container: ".o-tease-list__item, .c-card",
            title: ".c-title__link, .c-title a",
            link: ".c-title__link, .c-title a",
            description: ".c-dek, .c-card__summary",
            image: ".c-lazy-image img, .c-featured-image img",
            publishedAt: ".c-timestamp, .c-card__datetime",
        },
    },
    {
        name: "The Hollywood Reporter",
        url: "https://www.hollywoodreporter.com/c/movies/",
        baseUrl: "https://www.hollywoodreporter.com",
        selector: {
            container: ".lrv-a-unstyle-link, .c-card",
            title: ".c-title, .c-title__link",
            link: "",
            description: ".c-dek, .c-card__summary",
            image: ".c-featured-image img, .c-lazy-image img",
        },
    },
    {
        name: "Entertainment Weekly",
        url: "https://ew.com/movies/",
        baseUrl: "https://ew.com",
        selector: {
            container: ".card, .mntl-card",
            title: ".card-title, .mntl-card__title",
            description: ".card-summary, .mntl-card__description",
            link: ".card-title a, .mntl-card__title-link",
            image: ".card-img img, .mntl-primary-image img",
        },
    },
    {
        name: "The Wrap",
        url: "https://www.thewrap.com/category/movies/",
        baseUrl: "https://www.thewrap.com",
        selector: {
            container: ".post-item, .river-post",
            title: ".entry-title a, .post-title a",
            link: ".entry-title a, .post-title a",
            description: ".excerpt, .post-excerpt",
            image: ".featured-image img, .post-thumbnail img",
            publishedAt: ".byline-date, .post-date",
        },
    },
    {
        name: "Deadline",
        url: "https://deadline.com/c/movies/",
        baseUrl: "https://deadline.com",
        selector: {
            container: ".c-card, .o-story",
            title: ".c-title a, .story-title a",
            link: ".c-title a, .story-title a",
            description: ".c-dek, .story-summary",
            image: ".c-featured-image img, .story-image img",
            publishedAt: ".c-timestamp, .story-date",
        },
    },
];
